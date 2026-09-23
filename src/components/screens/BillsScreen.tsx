'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Zap,
  Droplets,
  Globe,
  GraduationCap,
  Loader2,
  Check,
  Clock,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface Biller {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface BillField {
  name: string;
  label: string;
  type: 'text' | 'number';
  required: boolean;
  placeholder?: string;
}

interface BillerConfig {
  fields: BillField[];
}

interface BillHistory {
  id: string;
  billerName: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  createdAt: string;
}

const billers: Biller[] = [
  { id: 'snel', name: 'SNEL', icon: Zap, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950/40' },
  { id: 'regideso', name: 'REGIDESO', icon: Droplets, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950/40' },
  { id: 'internet', name: 'Internet', icon: Globe, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-950/40' },
  { id: 'ecole', name: 'École', icon: GraduationCap, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950/40' },
];

const billerConfigs: Record<string, BillerConfig> = {
  snel: { fields: [
    { name: 'contractNumber', label: 'Numéro de contrat', type: 'text', required: true, placeholder: 'SNEL-XXXXX' },
    { name: 'meterNumber', label: 'Numéro du compteur', type: 'text', required: false, placeholder: 'Optionnel' },
  ]},
  regideso: { fields: [
    { name: 'contractNumber', label: 'Numéro de contrat', type: 'text', required: true, placeholder: 'REG-XXXXX' },
    { name: 'meterNumber', label: 'Numéro du compteur', type: 'text', required: true, placeholder: 'Compteur...' },
  ]},
  internet: { fields: [
    { name: 'contractNumber', label: 'Numéro de contrat', type: 'text', required: true, placeholder: 'Client ID' },
    { name: 'phoneNumber', label: 'Téléphone', type: 'text', required: false, placeholder: '+243 ...' },
  ]},
  ecole: { fields: [
    { name: 'studentId', label: 'Matricule élève', type: 'text', required: true, placeholder: 'Matricule...' },
    { name: 'schoolName', label: 'Nom de l\'école', type: 'text', required: true, placeholder: 'École...' },
  ]},
};

export default function BillsScreen() {
  const { user, navigateTo, setPendingPinAction } = useAppStore();
  const { t } = useTranslation();
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [history, setHistory] = useState<BillHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchHistory();
    else setLoading(false);
  }, [user?.id]);

  async function fetchHistory() {
    try {
      const res = await fetch(`/api/bills/history`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setHistory(data.history ?? []);
    } catch {}
    finally { setLoading(false); }
  }

  function selectBiller(biller: Biller) {
    setSelectedBiller(biller);
    setFormFields({});
    setAmount('');
  }

  function handleConfirm() {
    const config = selectedBiller ? billerConfigs[selectedBiller.id] : null;
    if (config) {
      for (const field of config.fields) {
        if (field.required && !formFields[field.name]?.trim()) {
          toast.error(`Veuillez remplir ${field.label}`);
          return;
        }
      }
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    setShowConfirm(true);
  }

  function handlePay() {
    setPendingPinAction(async () => {
      setProcessing(true);
      try {
        const res = await fetch('/api/bills/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            billerId: selectedBiller?.id,
            fields: formFields,
            amount: parseFloat(amount),
            currency,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`Paiement effectué ! Réf: ${data.reference}`);
          setShowConfirm(false);
          setSelectedBiller(null);
          setAmount('');
          fetchHistory();
        } else toast.error(data.message || 'Erreur');
      } catch { toast.error('Erreur de connexion'); }
      finally { setProcessing(false); }
    });
    navigateTo('pin-verify');
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Factures & Paiements</h1>
      </div>

      {!selectedBiller ? (
        <>
          <div className="px-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Choisissez un service</p>
            <div className="grid grid-cols-2 gap-3">
              {billers.map((biller) => {
                const Icon = biller.icon;
                return (
                  <button key={biller.id} onClick={() => selectBiller(biller)}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-[#0D5C63]/30 hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className={`w-14 h-14 rounded-2xl ${biller.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-7 w-7 ${biller.color}`} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{biller.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-4 mt-8">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-[#0D5C63]" />
              Historique des paiements
            </h3>
            {loading ? (
              <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : history.length === 0 ? (
              <Card className="border-border">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Aucun paiement effectué</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <Card key={item.id} className="border-border">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.billerName}</p>
                        <p className="text-[10px] text-muted-foreground">Réf: {item.reference}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">
                          {item.currency === 'FC' ? '' : '$'}{item.amount.toFixed(2)} {item.currency === 'FC' ? 'FC' : ''}
                        </p>
                        <Badge variant="secondary" className="text-[10px] mt-1">
                          {item.status === 'completed' ? 'Payé' : item.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="px-4 space-y-4">
          <button onClick={() => setSelectedBiller(null)} className="text-sm text-[#0D5C63] font-medium flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>

          <Card className="border-border">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${selectedBiller.bgColor} flex items-center justify-center`}>
                  <selectedBiller.icon className={`h-5 w-5 ${selectedBiller.color}`} />
                </div>
                <p className="text-lg font-bold text-foreground">{selectedBiller.name}</p>
              </div>

              {billerConfigs[selectedBiller.id]?.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input placeholder={field.placeholder} value={formFields[field.name] || ''}
                    onChange={e => setFormFields({ ...formFields, [field.name]: e.target.value })} />
                </div>
              ))}

              <div className="space-y-2">
                <Label>Montant à payer</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    {currency === 'FC' ? '' : '$'}
                  </span>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={currency === 'FC' ? 'pl-3' : 'pl-7'} />
                  <div className="absolute right-1 top-1 bottom-1 flex gap-1">
                    <button type="button" onClick={() => setCurrency('USD')}
                      className={`px-2 rounded-lg text-xs font-bold transition-all ${currency === 'USD' ? 'bg-[#0D5C63] text-white' : 'bg-muted text-muted-foreground'}`}>
                      USD
                    </button>
                    <button type="button" onClick={() => setCurrency('FC')}
                      className={`px-2 rounded-lg text-xs font-bold transition-all ${currency === 'FC' ? 'bg-[#EF4444] text-white' : 'bg-muted text-muted-foreground'}`}>
                      FC
                    </button>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white h-12 rounded-xl font-semibold"
                onClick={handleConfirm}>
                Payer
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader><DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription>Veuillez vérifier les informations</DialogDescription></DialogHeader>
          <div className="rounded-xl bg-muted/50 p-4 space-y-2 my-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium">{selectedBiller?.name}</span>
            </div>
            {Object.entries(formFields).map(([key, val]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium">{val}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="font-medium">Montant</span>
              <span className="font-bold text-[#0D5C63]">
                {currency === 'FC' ? '' : '$'}{parseFloat(amount || '0').toFixed(2)} {currency === 'FC' ? 'FC' : 'USD'}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowConfirm(false)}>Annuler</Button>
            <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={handlePay} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
