'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

function fmtCur(amount: number, currency: string) {
  if (currency === 'FC') return `${amount.toFixed(2)} FC`;
  return `$${amount.toFixed(2)}`;
}

export default function WithdrawScreen() {
  const { user, navigateTo, setUser, setPendingPinAction, preferredCurrency, setPreferredCurrency } = useAppStore();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [agentNumber, setAgentNumber] = useState('');
  const [currency, setCurrency] = useState(preferredCurrency || 'USD');
  const [method, setMethod] = useState('agent');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // -- Agent resolution: accepts AGT-code digits OR agent phone --
  const [agentName, setAgentName] = useState<string | null>(null);
  const [resolvingAgent, setResolvingAgent] = useState(false);
  const [agentLookupError, setAgentLookupError] = useState<string | null>(null);
  const [agentInput, setAgentInput] = useState('');

  useEffect(() => {
    let active = true;
    const raw = agentInput.trim();
    if (raw.length >= 4) {
      setResolvingAgent(true);
      setAgentLookupError(null);
      const digits = raw.replace(/\D/g, '');
      const candidates = new Set<string>();
      const normalized = raw.toUpperCase().replace(/\s+/g, '');

      if (/^AGT-/i.test(raw)) {
        candidates.add(normalized);
        const bare = normalized.replace(/^AGT-/, '');
        if (bare) candidates.add(`AGT-${bare}`);
      }
      if (digits) {
        if (digits.length === 6) {
          candidates.add(`AGT-${digits}`);
          candidates.add(digits);
        } else if (digits.length > 6 && digits.length <= 15) {
          candidates.add(`AGT-${digits.slice(-6)}`);
          candidates.add(digits.slice(-6));
          candidates.add(digits);
        } else if (digits.length >= 8) {
          candidates.add(digits);
        }
      }
      if (raw.startsWith('+') || digits.length >= 8) candidates.add(raw);

      const codes = [...candidates];
      if (codes.length === 0) {
        setAgentName(null);
        setResolvingAgent(false);
        setAgentLookupError(null);
        return;
      }

      const token = useAppStore.getState().token;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      Promise.all(
        codes.map((c) =>
          fetch(`/api/ussd/agent-lookup?code=${encodeURIComponent(c)}`, { headers })
            .then((r) => r.json())
            .catch(() => null)
        )
      ).then((results) => {
        if (!active) return;
        const ok = results.find((d) => d && d.success && d.agent);
        if (ok?.agent) {
          setAgentName(ok.agent.name);
          setAgentLookupError(null);
        } else {
          setAgentName(null);
          const msg = results.find((d) => d && d.message && /non trouv|valid|suspend|authent/i.test(d.message));
          setAgentLookupError(msg?.message || 'Agent non trouvé. Vérifiez le code agent (ex: AGT-123456).');
        }
        setResolvingAgent(false);
      }).catch(() => {
        if (active) {
          setAgentName(null);
          setAgentLookupError('Erreur de recherche agent');
          setResolvingAgent(false);
        }
      });
    } else {
      setAgentName(null);
      setAgentLookupError(null);
    }
    return () => {
      active = false;
    };
  }, [agentInput]);

  const isFC = currency === 'FC';
  const numericAmount = parseFloat(amount) || 0;
  const fee = Math.round(numericAmount * 0.007 * 100) / 100;
  const total = numericAmount + fee;
  const realBalance = isFC
    ? (user?.realBalanceFC ?? 0)
    : (user?.realBalance ?? 0);

  function buildAgentCode(): string {
    const raw = agentInput.trim();
    const digits = raw.replace(/\D/g, '');
    const normalized = raw.toUpperCase().replace(/\s+/g, '');
    if (/^AGT-/i.test(raw)) return normalized;
    // Exact 6-digit agent code
    if (digits.length === 6) return `AGT-${digits}`;
    // Longer digits: last 6 as AGT code (common when pasting partial)
    if (digits.length > 6 && digits.length <= 15) return `AGT-${digits.slice(-6)}`;
    if (digits) return digits;
    return raw;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (numericAmount <= 0) {
      toast.error(t('send.amount_required'));
      return;
    }
    if (!agentInput.trim()) {
      toast.error(t('withdraw.agent_required'));
      return;
    }
    if (!agentName) {
      toast.error(agentLookupError || 'Agent non trouvé ou non validé. Vérifiez le code agent (ex: AGT-123456).');
      return;
    }
    if (total > realBalance) {
      toast.error(t('withdraw.insufficient', { amount: fmtCur(realBalance, currency) }));
      return;
    }
    setShowConfirm(true);
  }

  function requestPinAndWithdraw() {
    if (!user?.id) return;
    setShowConfirm(false);

    const agentCode = buildAgentCode();
    const token = useAppStore.getState().token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    setPendingPinAction(() => async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/transfer/withdraw', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userId: user.id,
            amount: numericAmount,
            currency,
            method,
            agentCode,
          }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.updatedBalances) {
            setUser({
              ...user,
              realBalance: data.updatedBalances.realBalance,
              realBalanceFC: data.updatedBalances.realBalanceFC,
              bonusBalance: data.updatedBalances.bonusBalance,
              bonusBalanceFC: data.updatedBalances.bonusBalanceFC,
            } as any);
          }
          toast.success(t('withdraw.success'));
          setAmount('');
          setAgentInput('');
          setAgentNumber('');
          navigateTo('home');
        } else {
          toast.error(data.message || t('withdraw.error'));
        }
      } catch {
        toast.error(t('validation.connection_error'));
      } finally {
        setLoading(false);
      }
    });

    navigateTo('pin-verify');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{t('withdraw.title')}</h1>
      </div>

      {/* Info banner */}
      <div className="px-4 mb-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
          <ShieldCheck className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">{t('withdraw.agent_required')}</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {t('withdraw.agent_required_desc')}
            </p>
          </div>
        </div>
      </div>

      {/* PIN info */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3" />
          <span>{t('send.pin_required')}</span>
        </div>
      </div>

      {/* Current Balance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="px-4 mb-6">
        <Card className={`border-border ${isFC ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-gradient-to-br from-emerald-50 to-emerald-100'}`}>
          <CardContent className="p-4 text-center">
            <p className={`text-sm ${isFC ? 'text-blue-600' : 'text-emerald-600'} mb-1`}>
              {t('withdraw.available')} ({currency})
            </p>
            <p className={`text-3xl font-bold ${isFC ? 'text-blue-700' : 'text-emerald-700'}`}>
              {fmtCur(realBalance, currency)}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Form Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }} className="px-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 space-y-5">
            {/* Currency */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Devise</Label>
              <Select value={currency} onValueChange={(v) => { setCurrency(v); setPreferredCurrency(v as 'USD' | 'FC'); }}>
                <SelectTrigger className="w-full h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - Dollar US</SelectItem>
                  <SelectItem value="FC">FC - Franc Congolais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="withdrawAmount" className="text-sm font-medium">Montant</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  {isFC ? '' : '$'}
                </span>
                <Input id="withdrawAmount" type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={`h-11 ${isFC ? 'pl-3' : 'pl-7'}`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">{currency}</span>
              </div>
            </div>

            {/* Agent Code / Phone (required) */}
            <div className="space-y-2">
              <Label htmlFor="agentCode" className="text-sm font-medium">
                Code agent ou numéro agent <span className="text-red-500">*</span>
              </Label>
              <Input
                id="agentCode"
                type="text"
                placeholder="AGT-123456 ou +228 90 00 00 00"
                value={agentInput}
                onChange={(e) => {
                  setAgentInput(e.target.value.slice(0, 20));
                  setAgentNumber(e.target.value.replace(/\D/g, '').slice(0, 15));
                }}
                className="h-11 font-mono"
              />
              {resolvingAgent ? (
                <p className="text-xs text-blue-500 animate-pulse">Recherche de l&apos;agent...</p>
              ) : agentName ? (
                <p className="text-sm text-emerald-600 font-medium">✅ {agentName}</p>
              ) : agentLookupError ? (
                <p className="text-xs text-red-500">{agentLookupError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Entrez le code agent (AGT-XXXXXX) ou le numéro de téléphone de l&apos;agent
                </p>
              )}
            </div>

            {/* Withdrawal Method - Enforced Agent-Only */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Méthode de retrait</Label>
              <div className="h-11 flex items-center px-3 border border-border rounded-lg bg-muted text-sm font-medium text-foreground">
                Via Agent unique
              </div>
            </div>

            {/* Fee & Total */}
            {numericAmount > 0 && (
              <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frais ({0.7}%)</span>
                  <span className="font-medium">{fmtCur(fee, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total débité</span>
                  <span className="font-bold text-foreground">{fmtCur(total, currency)}</span>
                </div>
                {total > realBalance && <p className="text-xs text-red-500 mt-1">Solde insuffisant</p>}
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-base cursor-pointer"
              onClick={handleSubmit}
              disabled={loading || !agentInput.trim() || !agentName || (numericAmount > 0 && total > realBalance)}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Traitement...
                </span>
              ) : 'Retirer'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirmer le retrait</DialogTitle>
            <DialogDescription>Vous êtes sur le point de retirer de l&apos;argent via un agent Trait.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted/50 p-4 space-y-2 my-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-medium">{fmtCur(numericAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Code agent</span>
              <span className="font-medium font-mono">{buildAgentCode()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frais</span>
              <span className="font-medium">{fmtCur(fee, currency)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm">
              <span className="font-medium">Total débité</span>
              <span className="font-bold text-red-500">-{fmtCur(total, currency)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="size-3" />Votre code PIN sera demandé pour confirmer
          </p>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowConfirm(false)}>Annuler</Button>
            <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={requestPinAndWithdraw} disabled={loading}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
