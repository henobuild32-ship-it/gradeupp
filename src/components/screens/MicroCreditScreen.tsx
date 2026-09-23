'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  BadgeAlert,
  ShieldCheck,
  Clock,
  CheckCircle,
  Loader2,
  Calendar,
  DollarSign,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface Credit {
  id: string;
  amount: number;
  currency: string;
  interest: number;
  totalRepayable: number;
  repaid: number;
  duration: number;
  status: 'active' | 'repaid' | 'overdue' | 'pending' | 'rejected';
  dueDate: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  repaid: { label: 'Remboursé', color: 'bg-green-100 text-green-700 border-green-200' },
  overdue: { label: 'En retard', color: 'bg-red-100 text-red-700 border-red-200' },
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  rejected: { label: 'Refusé', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const INTEREST_RATE = 0.05;

export default function MicroCreditScreen() {
  const { user, navigateTo, setPendingPinAction } = useAppStore();
  const { t } = useTranslation();
  const [kycStatus, setKycStatus] = useState('verified');
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditScore, setCreditScore] = useState(0);

  const [requestAmount, setRequestAmount] = useState(50);
  const [requestCurrency, setRequestCurrency] = useState('USD');
  const [requestDuration, setRequestDuration] = useState('30');
  const [requesting, setRequesting] = useState(false);

  const [repaying, setRepaying] = useState<Credit | null>(null);
  const [repayAmount, setRepayAmount] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchKycStatus();
      fetchCredits();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  async function fetchKycStatus() {
    try {
      const res = await fetch(`/api/kyc?userId=${user?.id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.kyc) setKycStatus(data.kyc.status);
    } catch {}
  }

  async function fetchCredits() {
    try {
      const res = await fetch(`/api/microcredit`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCredits(data.credits ?? []);
        setCreditScore(data.creditScore ?? 0);
      }
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }

  const activeCredits = credits.filter(c => c.status === 'active');
  const totalBorrowed = credits.reduce((s, c) => s + c.amount, 0);
  const totalRepaid = credits.reduce((s, c) => s + c.repaid, 0);
  const outstanding = credits.filter(c => c.status === 'active')
    .reduce((s, c) => s + (c.totalRepayable - c.repaid), 0);

  const estimatedRepayment = requestAmount * (1 + INTEREST_RATE);
  const durationDays = parseInt(requestDuration);

  async function handleRequest() {
    if (requestAmount <= 0) { toast.error('Montant invalide'); return; }
    setRequesting(true);
    try {
      const res = await fetch('/api/microcredit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          amount: requestAmount,
          currency: requestCurrency,
          duration: durationDays,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Demande de crédit envoyée !');
        fetchCredits();
      } else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur de connexion'); }
    finally { setRequesting(false); }
  }

  function handleRepay() {
    if (!repaying || !repayAmount || parseFloat(repayAmount) <= 0) {
      toast.error('Montant invalide'); return;
    }
    setPendingPinAction(async () => {
      try {
        const res = await fetch('/api/microcredit/repay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creditId: repaying.id,
            userId: user?.id,
            amount: parseFloat(repayAmount),
          }),
        });
        const data = await res.json();
        if (data.success) { toast.success('Remboursement effectué !'); setRepaying(null); fetchCredits(); }
        else toast.error(data.message || 'Erreur');
      } catch { toast.error('Erreur'); }
    });
    navigateTo('pin-verify');
  }

  const kycBanner = kycStatus !== 'verified';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Micro-crédit TRAIT</h1>
      </div>

      <div className="px-4 space-y-4">
        {kycBanner && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <BadgeAlert className="h-8 w-8 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Vérifiez votre identité (KYC)</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">pour accéder au crédit</p>
              </div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs"
                onClick={() => navigateTo('kyc-verification')}>
                Vérifier
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-[#0D5C63] to-[#14888F] text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium opacity-90">Score de crédit</p>
              <Badge className="bg-white/20 text-white border-0 text-xs">
                {creditScore}/100
              </Badge>
            </div>
            <Progress value={creditScore} className="bg-white/20 [&>div]:bg-white" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-4 w-4 text-[#0D5C63] mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">${totalBorrowed.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">Emprunté</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <TrendingDown className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">${totalRepaid.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">Remboursé</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <Wallet className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">${outstanding.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">Impayé</p>
            </CardContent>
          </Card>
        </div>

        {!kycBanner && (
          <Card className="border-border">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Faire une demande</h3>
              <div className="space-y-3">
                <div>
                  <Label>Montant: ${requestAmount}</Label>
                  <Slider value={[requestAmount]} onValueChange={([v]) => setRequestAmount(v)}
                    min={10} max={1000} step={10} className="mt-2" />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>$10</span><span>$1000</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Devise</Label>
                    <Select value={requestCurrency} onValueChange={setRequestCurrency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="FC">FC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Durée</Label>
                    <Select value={requestDuration} onValueChange={setRequestDuration}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 jours</SelectItem>
                        <SelectItem value="15">15 jours</SelectItem>
                        <SelectItem value="30">30 jours</SelectItem>
                        <SelectItem value="60">60 jours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/50 p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Montant</span>
                    <span>${requestAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Intérêt (5%)</span>
                    <span>${(requestAmount * INTEREST_RATE).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-1 border-t">
                    <span>Total à rembourser</span>
                    <span className="text-[#0D5C63]">${estimatedRepayment.toFixed(2)}</span>
                  </div>
                </div>

                <Button className="w-full bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white h-11 rounded-xl"
                  onClick={handleRequest} disabled={requesting}>
                  {requesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Soumettre la demande
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">Historique des crédits</h3>
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : credits.length === 0 ? (
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Wallet className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Aucun crédit</p>
                <p className="text-xs text-muted-foreground text-center">Découvrez votre éligibilité !</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {credits.map((credit) => {
                const progress = credit.totalRepayable > 0
                  ? Math.min((credit.repaid / credit.totalRepayable) * 100, 100) : 0;
                return (
                  <Card key={credit.id} className="border-border">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-base font-bold text-foreground">
                            {credit.currency === 'FC' ? '' : '$'}{credit.amount.toFixed(2)} {credit.currency === 'FC' ? 'FC' : 'USD'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Durée: {credit.duration} jours
                          </p>
                        </div>
                        <Badge className={`${statusConfig[credit.status].color} border text-[10px]`}>
                          {statusConfig[credit.status].label}
                        </Badge>
                      </div>

                      {(credit.status === 'active' || credit.status === 'overdue') && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Progrès de remboursement</span>
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Payé: ${credit.repaid.toFixed(2)}</span>
                            <span className={credit.status === 'overdue' ? 'text-red-500' : 'text-muted-foreground'}>
                              Restant: ${(credit.totalRepayable - credit.repaid).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Échéance: {new Date(credit.dueDate).toLocaleDateString('fr-FR')}
                          </div>
                          {credit.status === 'active' && (
                            <Button size="sm" className="w-full mt-2 h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => { setRepaying(credit); setRepayAmount(''); }}>
                              Rembourser
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!repaying} onOpenChange={(o) => { if (!o) setRepaying(null); }}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader><DialogTitle>Rembourser le crédit</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {repaying && (
              <div className="rounded-xl bg-muted/50 p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Restant dû</span>
                  <span className="font-bold">${(repaying.totalRepayable - repaying.repaid).toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Montant du remboursement</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={repayAmount}
                onChange={e => setRepayAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setRepaying(null)}>Annuler</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" onClick={handleRepay}>
              Rembourser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
