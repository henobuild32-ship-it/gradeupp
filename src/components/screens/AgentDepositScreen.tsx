'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, UserPlus, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export default function AgentDepositScreen() {
  const { goBack, user, navigateTo } = useAppStore();
  const [clientPhone, setClientPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'FC'>('USD');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientPhone.trim()) {
      toast.error('Entrez le numéro du client');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Entrez un montant valide');
      return;
    }

    setLoading(true);

    try {
      const token = useAppStore.getState().token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/agent/deposit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientPhone: clientPhone.trim(),
          amount: parseFloat(amount),
          currency,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 403 && /validé|suspendu|bloqué/i.test(data.message || '')) {
          toast.error(data.message || 'Votre compte agent n\'est pas actif pour les dépôts');
        } else {
          toast.error(data.message || 'Erreur lors du dépôt');
        }
        return;
      }

      toast.success(
        data.deposit?.description || `Dépôt de ${amount} ${currency} effectué avec succès !`
      );
      setClientPhone('');
      setAmount('');
      navigateTo('agent-dashboard');
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [5, 10, 25, 50];
  const rawCode = user?.agentCode || user?.agentNumber || '';
  const digitsOnly = rawCode.replace(/\D/g, '');
  const agentIdentifier = rawCode
    ? /^AGT-/i.test(rawCode)
      ? rawCode.toUpperCase().replace(/\s+/g, '')
      : digitsOnly
        ? `AGT-${digitsOnly.slice(-6)}`
        : rawCode
    : 'N/A';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-emerald-600" />
            <h1 className="text-lg font-semibold">Dépôt client</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-amber-50 border-amber-200 mb-6">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <DollarSign className="size-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs text-amber-600">Agent</p>
                <p className="text-sm font-semibold text-amber-800 font-mono">
                  {agentIdentifier}
                </p>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label className="text-foreground font-medium">Numéro du client</Label>
              <Input
                type="tel"
                placeholder="+228 90 11 22 33"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="h-12 focus-visible:border-emerald-500 text-base"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-foreground font-medium">Devise</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['USD', 'FC'] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={currency === value ? 'default' : 'outline'}
                    className={currency === value ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                    onClick={() => setCurrency(value)}
                    disabled={loading}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-foreground font-medium">Montant ({currency})</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 focus-visible:border-emerald-500 text-base text-2xl font-bold"
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                  onClick={() => setAmount(amt.toString())}
                  disabled={loading}
                >
                  {currency === 'USD' ? '$' : ''}{amt}{currency === 'FC' ? ' FC' : ''}
                </Button>
              ))}
            </div>

            <Button
              type="submit"
              disabled={loading || !clientPhone.trim() || !amount}
              className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200 disabled:opacity-50 cursor-pointer mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Traitement...
                </>
              ) : (
                'Effectuer le dépôt'
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
