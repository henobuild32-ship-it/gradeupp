'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit3,
  Loader2,
  Repeat,
  Calendar,
  DollarSign,
  Search,
  Check,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface RecurringPayment {
  id: string;
  recipientName: string;
  amount: number;
  currency: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextRunDate: string;
  status: 'active' | 'paused' | 'cancelled';
  description: string;
  startDate: string;
  createdAt: string;
}

const freqLabels: Record<string, string> = {
  daily: 'Quotidien', weekly: 'Hebdomadaire', monthly: 'Mensuel', yearly: 'Annuel',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  paused: { label: 'En pause', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function RecurringPaymentsScreen() {
  const { user, navigateTo, setPendingPinAction } = useAppStore();
  const { t } = useTranslation();
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<RecurringPayment | null>(null);
  const [deleting, setDeleting] = useState<RecurringPayment | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const [formPhone, setFormPhone] = useState('');
  const [formRecipientName, setFormRecipientName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formFrequency, setFormFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    if (user?.id) fetchPayments();
    else setLoading(false);
  }, [user?.id]);

  async function fetchPayments() {
    try {
      const res = await fetch(`/api/payments/recurring`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setPayments(data.payments ?? []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }

  async function handleLookup() {
    if (!formPhone.trim()) return;
    setLookingUp(true);
    try {
      const res = await fetch(`/api/users/lookup?phone=${encodeURIComponent(formPhone)}`);
      const data = await res.json();
      if (data.success && data.user) setFormRecipientName(data.user.name);
      else { setFormRecipientName(''); toast.error('Utilisateur non trouvé'); }
    } catch { toast.error('Erreur'); }
    finally { setLookingUp(false); }
  }

  async function handleCreate() {
    if (!formRecipientName || !formAmount || parseFloat(formAmount) <= 0 || !formStartDate) {
      toast.error('Veuillez remplir tous les champs requis'); return;
    }
    setProcessing('create');
    try {
      const res = await fetch('/api/payments/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          recipientPhone: formPhone,
          amount: parseFloat(formAmount),
          currency: formCurrency,
          frequency: formFrequency,
          description: formDescription,
          nextRun: formStartDate,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Paiement récurrent créé !'); setShowCreate(false); resetForm(); fetchPayments(); }
      else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur de connexion'); }
    finally { setProcessing(null); }
  }

  async function handleToggleStatus(payment: RecurringPayment) {
    const newStatus = payment.status === 'active' ? 'paused' : 'active';
    setProcessing(payment.id);
    try {
      const res = await fetch(`/api/payments/recurring/${payment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { toast.success(newStatus === 'paused' ? 'Paiement mis en pause' : 'Paiement repris'); fetchPayments(); }
      else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur'); }
    finally { setProcessing(null); }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/payments/recurring/${deleting.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) { toast.success('Paiement supprimé'); setDeleting(null); fetchPayments(); }
      else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur'); }
  }

  async function handleEdit() {
    if (!editing || !formAmount || parseFloat(formAmount) <= 0) { toast.error('Montant invalide'); return; }
    setProcessing('edit');
    try {
      const res = await fetch(`/api/payments/recurring/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(formAmount), frequency: formFrequency,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Paiement modifié'); setEditing(null); fetchPayments(); }
      else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur'); }
    finally { setProcessing(null); }
  }

  function resetForm() {
    setFormPhone(''); setFormRecipientName(''); setFormAmount('');
    setFormCurrency('USD'); setFormFrequency('monthly'); setFormDescription(''); setFormStartDate('');
  }

  function openEdit(p: RecurringPayment) {
    setEditing(p);
    setFormAmount(p.amount.toString());
    setFormCurrency(p.currency);
    setFormFrequency(p.frequency);
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Paiements récurrents</h1>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
        ) : payments.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Repeat className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">Aucun paiement récurrent</p>
              <p className="text-sm text-muted-foreground text-center mb-6">Créez votre premier paiement automatique</p>
              <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />Créer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map((p, idx) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0D5C63]/10 flex items-center justify-center">
                          <Repeat className="h-5 w-5 text-[#0D5C63]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{p.recipientName}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{freqLabels[p.frequency] || p.frequency}</p>
                        </div>
                      </div>
                      <Badge className={`${statusConfig[p.status].color} border text-[10px]`}>
                        {statusConfig[p.status].label}
                      </Badge>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold text-foreground">
                          {p.currency === 'FC' ? '' : '$'}{p.amount.toFixed(2)} {p.currency === 'FC' ? 'FC' : 'USD'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Prochain: {new Date(p.nextRunDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {p.status !== 'cancelled' && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl"
                            onClick={() => handleToggleStatus(p)} disabled={processing === p.id}>
                            {p.status === 'active' ? <Pause className="h-4 w-4 text-amber-600" /> : <Play className="h-4 w-4 text-emerald-600" />}
                          </Button>
                        )}
                        {p.status !== 'cancelled' && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => openEdit(p)}>
                            <Edit3 className="h-4 w-4 text-[#0D5C63]" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => setDeleting(p)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#0D5C63] text-white shadow-lg shadow-[#0D5C63]/30 flex items-center justify-center hover:bg-[#0D5C63]/90 active:scale-95 transition-all z-40">
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader><DialogTitle>Nouveau paiement récurrent</DialogTitle>
            <DialogDescription>Configurez un paiement automatique régulier</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Numéro du destinataire</Label>
              <div className="flex gap-2">
                <Input placeholder="+243 000 000 000" value={formPhone}
                  onChange={e => { setFormPhone(e.target.value); setFormRecipientName(''); }} className="flex-1" />
                <Button variant="outline" className="rounded-xl" onClick={handleLookup} disabled={lookingUp}>
                  {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {formRecipientName && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{formRecipientName}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Montant</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={formAmount} onChange={e => setFormAmount(e.target.value)} />
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
            </div>
            <div className="space-y-2">
              <Label>Fréquence</Label>
              <Select value={formFrequency} onValueChange={(v: any) => setFormFrequency(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="yearly">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground">(optionnelle)</span></Label>
              <Input placeholder="Ex: Abonnement" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => { setShowCreate(false); resetForm(); }}>Annuler</Button>
            <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={handleCreate} disabled={processing === 'create'}>
              {processing === 'create' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader><DialogTitle>Modifier le paiement</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Montant</Label>
              <Input type="number" step="0.01" min="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} />
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
              <Label>Fréquence</Label>
              <Select value={formFrequency} onValueChange={(v: any) => setFormFrequency(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="yearly">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditing(null)}>Annuler</Button>
            <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={handleEdit} disabled={processing === 'edit'}>
              {processing === 'edit' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
