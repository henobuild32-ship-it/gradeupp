'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowLeftRight, Clock3, Coins, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

type FeeCurrency = 'USD' | 'CDF';
type FeeRecord = {
  id: string;
  operation: 'send' | 'withdrawal';
  status: 'pending' | 'completed';
  amount: number;
  fee: number;
  feeFromBonus: boolean;
  currency: FeeCurrency;
  createdAt: string;
  userName: string;
  userPhone: string | null;
  counterpartyName: string;
  counterpartyPhone: string | null;
};
type FeeSummary = { USD: number; CDF: number };

const emptySummary = (): { collected: FeeSummary; pending: FeeSummary } => ({
  collected: { USD: 0, CDF: 0 },
  pending: { USD: 0, CDF: 0 },
});

function formatMoney(value: number, currency: FeeCurrency) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function feeRate(record: FeeRecord) {
  if (record.amount <= 0) return '—';
  const percentage = (record.fee / record.amount) * 100;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(percentage)} %`;
}

export default function AdminFeesScreen() {
  const navigateTo = useAppStore((state) => state.navigateTo);
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = useCallback(async (nextPage: number, append: boolean) => {
    try {
      const response = await fetch(`/api/admin/fees?page=${nextPage}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Impossible de charger les frais TRAIT.');
      setSummary(data.summary || emptySummary());
      setTotalRecords(Number(data.totalRecords) || 0);
      setHasMore(Boolean(data.hasMore));
      setPage(nextPage);
      setRecords((current) => append ? [...current, ...data.records] : data.records);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de charger les frais TRAIT.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  const feeCards = [
    { label: 'Frais retenus · USD', amount: summary.collected.USD, currency: 'USD' as const, icon: Wallet, tone: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' },
    { label: 'Frais retenus · CDF', amount: summary.collected.CDF, currency: 'CDF' as const, icon: Wallet, tone: 'text-teal-600 bg-teal-100 dark:bg-teal-900/40' },
    { label: 'Retraits en attente · USD', amount: summary.pending.USD, currency: 'USD' as const, icon: Clock3, tone: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' },
    { label: 'Retraits en attente · CDF', amount: summary.pending.CDF, currency: 'CDF' as const, icon: Clock3, tone: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' },
  ];

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md">
        <Button variant="ghost" size="icon" aria-label="Retour au tableau de bord" onClick={() => navigateTo('admin-dashboard')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold leading-tight">Frais TRAIT retenus</h1>
          <p className="text-xs text-muted-foreground">Envois et retraits · taux appliqué : 1 %</p>
        </div>
        <Button variant="outline" size="sm" className="min-h-10" onClick={() => { setLoading(true); void loadPage(0, false); }} disabled={loading}>
          <RefreshCw className="mr-2 size-4" /> Actualiser
        </Button>
      </header>

      <main className="space-y-5 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {feeCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="border-border">
                <CardContent className="p-4">
                  <div className={`mb-3 flex size-9 items-center justify-center rounded-xl ${card.tone}`}>
                    <Icon className="size-4" />
                  </div>
                  <p className="text-lg font-bold leading-tight text-foreground">{formatMoney(card.amount, card.currency)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Historique des frais</h2>
                <p className="mt-1 text-xs text-muted-foreground">{records.length} affichés sur {totalRecords} opérations facturées.</p>
              </div>
              <Coins className="size-5 shrink-0 text-emerald-600" />
            </div>

            <div className="mt-4 space-y-3">
              {loading ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2 rounded-xl border border-border p-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              )) : records.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <ArrowLeftRight className="mb-3 size-9 text-muted-foreground" />
                  <p className="font-medium">Aucun frais TRAIT enregistré</p>
                  <p className="mt-1 text-sm text-muted-foreground">Les commissions apparaîtront ici après les envois et retraits.</p>
                </div>
              ) : records.map((record) => (
                <article key={record.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{record.operation === 'send' ? 'Envoi Trait' : 'Retrait via agent'}</Badge>
                        <Badge className={record.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}>
                          {record.status === 'completed' ? 'Retenu' : 'En attente'}
                        </Badge>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold">{record.userName} {record.userPhone ? `· ${record.userPhone}` : ''}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {record.operation === 'send' ? 'Destinataire' : 'Agent'} : {record.counterpartyName}{record.counterpartyPhone ? ` · ${record.counterpartyPhone}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">+{formatMoney(record.fee, record.currency)}</p>
                      <p className="text-xs text-muted-foreground">Frais · {feeRate(record)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>Montant : {formatMoney(record.amount, record.currency)}{record.feeFromBonus ? ' · frais pris sur le bonus' : ''}</span>
                    <span>{formatDate(record.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>

            {hasMore && !loading && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" className="min-h-11" onClick={() => { setLoadingMore(true); void loadPage(page + 1, true); }} disabled={loadingMore}>
                  {loadingMore ? <><Loader2 className="mr-2 size-4 animate-spin" />Chargement…</> : 'Afficher plus'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
