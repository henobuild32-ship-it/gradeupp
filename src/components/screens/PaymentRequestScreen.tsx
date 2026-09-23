'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Check,
  X,
  Loader2,
  User,
  Search,
  DollarSign,
  Send,
  Inbox,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface PaymentRequest {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  requester: { id: string; name: string; phone: string };
  recipient: { id: string; name: string; phone: string };
}

const statusBadge: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' },
  accepted: { label: 'Acceptée', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' },
  rejected: { label: 'Refusée', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400' },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400' },
};

export default function PaymentRequestScreen() {
  const { user, navigateTo, setPendingPinAction } = useAppStore();
  const { t } = useTranslation();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [showCreate, setShowCreate] = useState(false);

  const [formPhone, setFormPhone] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formDescription, setFormDescription] = useState('');
  const [lookupName, setLookupName] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.id) fetchRequests();
    else setLoading(false);
  }, [user?.id]);

  async function fetchRequests() {
    try {
      const res = await fetch(`/api/payments/request`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setRequests(data.requests ?? []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }

  async function handleLookup() {
    if (!formPhone.trim()) { toast.error('Entrez un numéro'); return; }
    setLookingUp(true);
    try {
      const res = await fetch(`/api/users/lookup?phone=${encodeURIComponent(formPhone)}`);
      const data = await res.json();
      if (data.success && data.user) {
        setLookupName(data.user.name);
      } else {
        setLookupName('');
        toast.error('Utilisateur non trouvé');
      }
    } catch { toast.error('Erreur de recherche'); }
    finally { setLookingUp(false); }
  }

  async function handleCreate() {
    if (!lookupName) { toast.error('Veuillez d\'abord rechercher un utilisateur'); return; }
    if (!formAmount || parseFloat(formAmount) <= 0) { toast.error('Montant invalide'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user?.id,
          targetPhone: formPhone,
          amount: parseFloat(formAmount),
          currency: formCurrency,
          description: formDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Demande envoyée !');
        setShowCreate(false);
        resetForm();
        fetchRequests();
      } else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur de connexion'); }
    finally { setCreating(false); }
  }

  function resetForm() {
    setFormPhone(''); setFormAmount(''); setFormCurrency('USD');
    setFormDescription(''); setLookupName(''); setLookingUp(false);
  }

  function handleAccept(request: PaymentRequest) {
    setPendingPinAction(async () => {
      try {
        const res = await fetch(`/api/payments/request/${request.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept', userId: user?.id }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Paiement accepté !');
          fetchRequests();
        } else toast.error(data.message || 'Erreur');
      } catch { toast.error('Erreur de connexion'); }
    });
    navigateTo('pin-verify');
  }

  async function handleReject(request: PaymentRequest) {
    try {
      const res = await fetch(`/api/payments/request/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', userId: user?.id }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Demande refusée'); fetchRequests(); }
      else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur de connexion'); }
  }

  const received = requests.filter(r => r.recipient.id === user?.id);
  const sent = requests.filter(r => r.requester.id === user?.id);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Demandes de paiement</h1>
      </div>

      <div className="flex px-4 border-b border-border mb-4">
        <button onClick={() => setTab('received')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 text-center transition-all ${
            tab === 'received' ? 'border-[#0D5C63] text-[#0D5C63]' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Inbox className="h-3.5 w-3.5 inline mr-1.5" />Reçues ({received.length})
        </button>
        <button onClick={() => setTab('sent')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 text-center transition-all ${
            tab === 'sent' ? 'border-[#0D5C63] text-[#0D5C63]' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Send className="h-3.5 w-3.5 inline mr-1.5" />Envoyées ({sent.length})
        </button>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {(tab === 'received' ? received : sent).length === 0 ? (
                <Card className="border-border">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Inbox className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-base font-semibold text-foreground mb-1">
                      Aucune demande {tab === 'received' ? 'reçue' : 'envoyée'}
                    </p>
                    <p className="text-sm text-muted-foreground text-center">Les demandes apparaîtront ici</p>
                  </CardContent>
                </Card>
              ) : (
                (tab === 'received' ? received : sent).map((req, idx) => (
                  <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className="border-border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0D5C63]/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-[#0D5C63]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {tab === 'received' ? req.requester.name : req.recipient.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {tab === 'received' ? req.requester.phone : req.recipient.phone}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${statusBadge[req.status].color} border text-[10px]`}>
                            {statusBadge[req.status].label}
                          </Badge>
                        </div>

                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg font-bold text-foreground">
                              {req.currency === 'FC' ? '' : '$'}{req.amount.toFixed(2)} {req.currency === 'FC' ? 'FC' : 'USD'}
                            </p>
                            {req.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">{new Date(req.createdAt).toLocaleDateString('fr-FR')}</p>
                          </div>

                          {tab === 'received' && req.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-9 text-xs rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleReject(req)}>
                                <X className="h-3.5 w-3.5 mr-1" />Refuser
                              </Button>
                              <Button size="sm" className="h-9 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleAccept(req)}>
                                <Check className="h-3.5 w-3.5 mr-1" />Accepter
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <button onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#0D5C63] text-white shadow-lg shadow-[#0D5C63]/30 flex items-center justify-center hover:bg-[#0D5C63]/90 active:scale-95 transition-all z-40">
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle demande</DialogTitle>
            <DialogDescription>Demandez un paiement à un utilisateur TRAIT</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Numéro de téléphone (+243)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="+243 000 000 000" value={formPhone}
                    onChange={e => { setFormPhone(e.target.value); setLookupName(''); }} className="pl-9" />
                </div>
                <Button variant="outline" className="rounded-xl shrink-0" onClick={handleLookup} disabled={lookingUp}>
                  {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {lookupName && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{lookupName}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Montant</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={formAmount}
                  onChange={e => setFormAmount(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={formCurrency} onValueChange={setFormCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="FC">FC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground">(optionnelle)</span></Label>
              <Input placeholder="Ex: Remboursement" value={formDescription}
                onChange={e => setFormDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => { setShowCreate(false); resetForm(); }}>Annuler</Button>
            <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={handleCreate} disabled={creating || !lookupName}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
