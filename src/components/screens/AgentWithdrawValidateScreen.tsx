'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, CheckCircle2, XCircle, Loader2, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

type PendingItem = {
  id: string;
  kind: 'withdrawal' | 'deposit';
  userName: string | null;
  userPseudo: string | null;
  userPhone: string;
  amount: number;
  fee?: number;
  currency: string;
  status: string;
  createdAt: string;
};

function fmtCur(amount: number, currency: string) {
  return currency === 'FC' ? `${amount.toFixed(2)} FC` : `$${amount.toFixed(2)}`;
}

function authHeaders(): Record<string, string> {
  const token = useAppStore.getState().token;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export default function AgentWithdrawValidateScreen() {
  const { goBack, user } = useAppStore();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function fetchPending() {
    setLoading(true);
    try {
      const [wRes, dRes] = await Promise.all([
        fetch('/api/agent/pending-withdrawals', { headers: authHeaders() }),
        fetch('/api/agent/pending-deposits', { headers: authHeaders() }),
      ]);
      const wData = await wRes.json();
      const dData = await dRes.json();

      if (wRes.status === 401 || dRes.status === 401) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        useAppStore.getState().setToken(null);
        useAppStore.getState().setUser(null as any);
        return;
      }

      const withdrawals: PendingItem[] = (wData.success ? wData.withdrawals || [] : []).map((w: any) => ({
        id: w.id,
        kind: 'withdrawal' as const,
        userName: w.userName,
        userPseudo: w.userPseudo,
        userPhone: w.userPhone,
        amount: w.amount,
        fee: w.fee,
        currency: w.currency,
        status: w.status,
        createdAt: w.createdAt,
      }));

      const deposits: PendingItem[] = (dData.success ? dData.deposits || [] : []).map((d: any) => ({
        id: d.id,
        kind: 'deposit' as const,
        userName: d.userName,
        userPseudo: d.userPseudo,
        userPhone: d.userPhone,
        amount: d.amount,
        fee: 0,
        currency: d.currency,
        status: d.status,
        createdAt: d.createdAt,
      }));

      const merged = [...deposits, ...withdrawals].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setItems(merged);

      if (!wData.success && !dData.success) {
        toast.error(wData.message || dData.message || 'Erreur lors du chargement');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.id) fetchPending();
  }, [user?.id]);

  async function handleAction(item: PendingItem, action: 'validate' | 'refuse') {
    setProcessingId(item.id);
    try {
      const endpoint =
        item.kind === 'deposit' ? '/api/agent/validate-deposit' : '/api/agent/validate-withdrawal';
      const body =
        item.kind === 'deposit'
          ? { depositId: item.id, action }
          : { withdrawalId: item.id, action };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Opération traitée');
        setItems((list) => list.filter((x) => x.id !== item.id));
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

  const totalDeposits = items.filter((i) => i.kind === 'deposit').length;
  const totalWithdrawals = items.filter((i) => i.kind === 'withdrawal').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-amber-600" />
            <h1 className="text-lg font-semibold">Valider opérations</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {!loading && items.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-emerald-600">Dépôts en attente</p>
                  <p className="text-xl font-bold text-emerald-700">{totalDeposits}</p>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-amber-600">Retraits en attente</p>
                  <p className="text-xl font-bold text-amber-700">{totalWithdrawals}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {loading ? (
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Chargement des opérations...</p>
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-lg font-semibold text-foreground">Tout est à jour !</p>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Aucun dépôt ni retrait en attente de validation
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const clientName = item.userName || item.userPseudo || 'Client';
                const processing = processingId === item.id;
                const isDeposit = item.kind === 'deposit';

                return (
                  <Card
                    key={`${item.kind}-${item.id}`}
                    className={`border-border ${isDeposit ? 'border-emerald-200' : 'border-amber-200'}`}
                  >
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center ${
                              isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {isDeposit ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{clientName}</p>
                            <p className="text-xs text-muted-foreground">{item.userPhone}</p>
                            <p className="text-xs font-medium text-muted-foreground mt-0.5">
                              {isDeposit ? 'Dépôt à valider' : 'Retrait à valider'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {item.status === 'pending' ? 'En attente' : item.status}
                        </Badge>
                      </div>

                      <div className="rounded-xl bg-muted/50 p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Montant</span>
                          <span className="font-semibold">{fmtCur(item.amount, item.currency)}</span>
                        </div>
                        {item.kind === 'withdrawal' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Frais</span>
                            <span className="font-medium">{fmtCur(item.fee || 0, item.currency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Demandé le</span>
                          <span>{new Date(item.createdAt).toLocaleString('fr-FR')}</span>
                        </div>
                      </div>

                      {isDeposit && (
                        <p className="text-xs text-muted-foreground">
                          En validant, le montant sera débité de votre solde agent et crédité au client.
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          disabled={processing}
                          onClick={() => handleAction(item, 'refuse')}
                        >
                          <XCircle className="size-4 mr-2" />
                          Refuser
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={processing}
                          onClick={() => handleAction(item, 'validate')}
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
