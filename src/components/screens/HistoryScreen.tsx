'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Download, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { TransactionReceipt } from '@/components/receipt/TransactionReceipt';

interface HistoryItem {
  id: string;
  type: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

type FilterTab = 'all' | 'send' | 'receive' | 'deposit' | 'withdrawal';

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'send', label: 'Envois' },
  { id: 'receive', label: 'Reçus' },
  { id: 'deposit', label: 'Dépôts' },
  { id: 'withdrawal', label: 'Retraits' },
];

function getTypeIcon(type: string) {
  switch (type) {
    case 'send': return '💸';
    case 'receive': return '💰';
    case 'deposit': return '➕';
    case 'withdrawal': return '🏧';
    default: return '📄';
  }
}

function getTypeBg(type: string) {
  switch (type) {
    case 'send': return 'bg-red-50';
    case 'receive': return 'bg-emerald-50';
    case 'deposit': return 'bg-emerald-50';
    case 'withdrawal': return 'bg-orange-50';
    default: return 'bg-muted';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Terminé</Badge>;
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">En attente</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Échoué</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  }
}

function fmtCur(amount: number, currency: string) {
  if (currency === 'FC') return `${amount.toFixed(2)} FC`;
  return `$${amount.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function HistoryScreen() {
  const { user, navigateTo } = useAppStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<HistoryItem | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async (cursor?: string | null, reset = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({ userId: user.id });
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/transfer/history?${params}`);
      const data = await res.json();
      if (data.success) {
        if (reset) {
          setHistory(data.history ?? []);
        } else {
          setHistory((prev) => [...prev, ...(data.history ?? [])]);
        }
        setHasMore(data.pagination?.hasMore ?? false);
        setNextCursor(data.pagination?.nextCursor ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      if (!cursor) toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHistory(null, true);
  }, [fetchHistory]);

  useEffect(() => {
    if (!observerRef.current || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          fetchHistory(nextCursor);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, nextCursor, fetchHistory]);

  function handleRefresh() {
    setRefreshing(true);
    fetchHistory(null, true);
  }

  function handleExport() {
    window.open(`/api/transfer/export?userId=${user?.id}&type=${activeTab}`, '_blank');
  }

  const filteredHistory =
    activeTab === 'all'
      ? history
      : history.filter((item) => item.type === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Historique</h1>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="space-y-1.5 text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <span className="text-5xl mb-4">📭</span>
              <p className="text-base font-medium text-foreground mb-1">
                {activeTab === 'all' ? 'Aucune transaction' : `Aucun ${filterTabs.find((t) => t.id === activeTab)?.label.toLowerCase()}`}
              </p>
              <p className="text-sm text-muted-foreground">Vos transactions apparaîtront ici</p>
              <Button variant="outline" className="mt-4 rounded-xl" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {filteredHistory.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border transition-colors cursor-pointer hover:bg-accent/50 active:scale-[0.98]"
                  onClick={() => setSelectedTx(tx)}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg shrink-0 ${getTypeBg(tx.type)}`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${
                      tx.type === 'receive' || tx.type === 'deposit' ? 'text-emerald-600' : tx.type === 'send' ? 'text-red-500' : 'text-orange-500'
                    }`}>
                      {tx.type === 'receive' || tx.type === 'deposit' ? '+' : '-'}{fmtCur(tx.amount, tx.currency)}
                    </p>
                    {tx.fee > 0 && (
                      <p className="text-[10px] text-muted-foreground">Frais: {fmtCur(tx.fee, tx.currency)}</p>
                    )}
                  </div>
                </motion.div>
              ))}

              {hasMore && (
                <div ref={observerRef} className="flex justify-center py-4">
                  {loadingMore && <Skeleton className="h-8 w-8 rounded-full" />}
                </div>
              )}

              {!hasMore && filteredHistory.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">Toutes les transactions chargées</p>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="h-8" />

      <AnimatePresence>
        {selectedTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setSelectedTx(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Détails de la transaction</h3>
                <button onClick={() => setSelectedTx(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 ${getTypeBg(selectedTx.type)}`}>
                  {getTypeIcon(selectedTx.type)}
                </div>
                <p className={`text-3xl font-bold ${
                  selectedTx.type === 'receive' || selectedTx.type === 'deposit' ? 'text-emerald-600' : selectedTx.type === 'send' ? 'text-red-500' : 'text-orange-500'
                }`}>
                  {selectedTx.type === 'receive' || selectedTx.type === 'deposit' ? '+' : '-'}{fmtCur(selectedTx.amount, selectedTx.currency)}
                </p>
                {selectedTx.fee > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">Frais: {fmtCur(selectedTx.fee, selectedTx.currency)}</p>
                )}
              </div>

              <div className="space-y-0 bg-gray-50 rounded-2xl overflow-hidden mb-6">
                {[
                  {
                    label: 'Type',
                    value: ({
                      send: 'Envoi',
                      receive: 'Réception',
                      deposit: 'Dépôt',
                      withdrawal: 'Retrait',
                    } as Record<string, string>)[selectedTx.type] ||
                      selectedTx.type.charAt(0).toUpperCase() + selectedTx.type.slice(1),
                  },
                  { label: 'Montant', value: fmtCur(selectedTx.amount, selectedTx.currency) },
                  ...(selectedTx.fee > 0 ? [{ label: 'Frais', value: fmtCur(selectedTx.fee, selectedTx.currency) }] : []),
                  { label: 'Devise', value: selectedTx.currency === 'FC' ? 'Franc congolais (FC)' : 'Dollar US (USD)' },
                  { label: 'Statut', value: getStatusBadge(selectedTx.status) },
                  { label: 'Date', value: formatDate(selectedTx.createdAt) },
                  { label: 'Description', value: selectedTx.description },
                  { label: 'ID', value: selectedTx.id, mono: true },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-500">{row.label}</span>
                    {typeof row.value === 'string' ? (
                      <span className={`text-sm font-medium text-gray-900 ${row.mono ? 'font-mono text-[10px] break-all max-w-[60%] text-right' : ''}`}>
                        {row.value}
                      </span>
                    ) : row.value}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => {
                    const shareData = {
                      title: 'Transaction TRAIT',
                      text: `Transaction ${selectedTx.type}: ${fmtCur(selectedTx.amount, selectedTx.currency)} - ${selectedTx.description} (${selectedTx.status})`,
                    };
                    if (navigator.share) navigator.share(shareData).catch(() => {});
                    else navigator.clipboard.writeText(shareData.text).then(() => toast.success('Copié !'));
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </Button>
                <div className="flex-1">
                  <TransactionReceipt
                    transaction={selectedTx}
                    userName={user?.name}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
