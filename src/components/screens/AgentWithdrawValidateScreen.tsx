'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

type PendingWithdrawal = {
  id: string;
  userName: string | null;
  userPseudo: string | null;
  userPhone: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  createdAt: string;
};

function fmtCur(amount: number, currency: string) {
  return currency === 'FC' ? `${amount.toFixed(2)} FC` : `$${amount.toFixed(2)}`;
}

export default function AgentWithdrawValidateScreen() {
  const { goBack, user } = useAppStore();
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function fetchPendingWithdrawals() {
    setLoading(true);
    try {
      const query = user?.id ? `?agentId=${encodeURIComponent(user.id)}` : '';
      const token = useAppStore.getState().token;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/agent/pending-withdrawals${query}`, { headers });
      const data = await res.json();
      if (data.success) {
        setPendingWithdrawals(data.withdrawals || []);
      } else {
        if (res.status === 401) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          useAppStore.getState().setToken(null);
          useAppStore.getState().setUser(null as any);
          return;
        }
        toast.error(data.message || 'Erreur lors du chargement');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPendingWithdrawals();
  }, [user?.id]);

  async function handleAction(withdrawalId: string, action: 'validate' | 'refuse') {
    setProcessingId(withdrawalId);
    try {
      const token = useAppStore.getState().token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/agent/validate-withdrawal', {
        method: 'POST',
        headers,
        body: JSON.stringify({ withdrawalId, action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Retrait traité');
        setPendingWithdrawals((items) => items.filter((item) => item.id !== withdrawalId));
      } else {
        if (res.status === 401) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          useAppStore.getState().setToken(null);
          useAppStore.getState().setUser(null as any);
          return;
        }
        toast.error(data.message || 'Erreur lors du traitement');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-amber-600" />
            <h1 className="text-lg font-semibold">Valider retrait</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {loading ? (
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Chargement des retraits...</p>
              </CardContent>
            </Card>
          ) : pendingWithdrawals.length === 0 ? (
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-lg font-semibold text-foreground">Tout est à jour !</p>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Aucun retrait en attente de validation
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingWithdrawals.map((w) => {
                const clientName = w.userName || w.userPseudo || 'Client';
                const processing = processingId === w.id;

                return (
                  <Card key={w.id} className="border-border">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{clientName}</p>
                          <p className="text-xs text-muted-foreground">{w.userPhone}</p>
                        </div>
                        <Badge variant="outline">{w.status}</Badge>
                      </div>

                      <div className="rounded-xl bg-muted/50 p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Montant</span>
                          <span className="font-semibold">{fmtCur(w.amount, w.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Frais</span>
                          <span className="font-medium">{fmtCur(w.fee, w.currency)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Demandé le</span>
                          <span>{new Date(w.createdAt).toLocaleString('fr-FR')}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          disabled={processing}
                          onClick={() => handleAction(w.id, 'refuse')}
                        >
                          <XCircle className="size-4 mr-2" />
                          Refuser
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={processing}
                          onClick={() => handleAction(w.id, 'validate')}
                        >
                          {processing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ShieldCheck className="size-4 mr-2" />}
                          Valider
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
