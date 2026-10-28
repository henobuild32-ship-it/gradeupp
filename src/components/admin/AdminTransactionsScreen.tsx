'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Phone,
  Calendar,
  ArrowRightLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldBan,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Tag,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  senderId: string;
  receiverId: string | null;
  senderName: string;
  senderPhone: string;
  receiverName: string | null;
  receiverPhone: string | null;
  agentId: string | null;
  agentName: string | null;
  createdAt: string;
}

type FilterTab = 'all' | 'send' | 'deposit' | 'withdrawal' | 'blocked' | 'completed' | 'pending';

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'send', label: 'Envois' },
  { key: 'deposit', label: 'Dépôts' },
  { key: 'withdrawal', label: 'Retraits' },
  { key: 'blocked', label: 'Bloquées' },
  { key: 'completed', label: 'Complétées' },
  { key: 'pending', label: 'En attente' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function getTypeConfig(type: string) {
  switch (type) {
    case 'send':
      return { label: 'Envoi', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/40', icon: ArrowRightLeft };
    case 'deposit':
      return { label: 'Dépôt', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40', icon: ArrowDownToLine };
    case 'withdrawal':
      return { label: 'Retrait', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800/40', icon: ArrowUpFromLine };
    default:
      return { label: type, color: 'bg-muted text-muted-foreground border-border', icon: ArrowRightLeft };
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return { label: 'Complétée', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40', icon: CheckCircle2 };
    case 'pending':
      return { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/40', icon: Clock };
    case 'failed':
      return { label: 'Échouée', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/40', icon: XCircle };
    case 'blocked':
      return { label: 'Bloquée', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/40', icon: ShieldBan };
    case 'cancelled':
      return { label: 'Annulée', color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-800/40', icon: XCircle };
    default:
      return { label: status, color: 'bg-muted text-muted-foreground border-border', icon: Clock };
  }
}

export default function AdminTransactionsScreen() {
  const { admin, goBack, navigateTo } = useAppStore();

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Block dialog
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState<Transaction | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Fetch Transactions ────────────────────────────────────────

  const fetchTransactions = useCallback(async (p: number, append: boolean) => {
    if (!append) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '10');

      if (activeFilter === 'send') params.set('type', 'send');
      else if (activeFilter === 'deposit') params.set('type', 'deposit');
      else if (activeFilter === 'withdrawal') params.set('type', 'withdrawal');
      else if (activeFilter === 'blocked') params.set('status', 'blocked');
      else if (activeFilter === 'completed') params.set('status', 'completed');
      else if (activeFilter === 'pending') params.set('status', 'pending');

      const res = await fetch(`/api/admin/transactions?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        const fetched: Transaction[] = data.transactions ?? [];
        if (append) {
          setTransactions((prev) => [...prev, ...fetched]);
        } else {
          setTransactions(fetched);
        }
        setHasMore(fetched.length >= 10);
        setPage(p);
      } else {
        toast.error(data.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      toast.error('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    setPage(1);
    fetchTransactions(1, false);
  }, [fetchTransactions]);

  function handleFilterChange(filter: FilterTab) {
    setActiveFilter(filter);
  }

  function handleLoadMore() {
    fetchTransactions(page + 1, true);
  }

  // ─── Block Transaction ─────────────────────────────────────────

  function openBlockDialog(tx: Transaction) {
    setBlockTarget(tx);
    setBlockReason('');
    setBlockDialogOpen(true);
  }

  async function handleBlockSubmit() {
    if (!blockTarget || !admin?.id) {
      toast.error('Données manquantes');
      return;
    }
    if (!blockReason.trim()) {
      toast.error('Veuillez saisir une raison');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: blockTarget.id,
          adminId: admin.id,
          action: 'block',
          reason: blockReason.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Transaction bloquée avec succès');
        setBlockDialogOpen(false);
        setBlockTarget(null);
        fetchTransactions(1, false);
      } else {
        toast.error(data.error || 'Échec du blocage');
      }
    } catch (err) {
      console.error('Block error:', err);
      toast.error('Erreur lors du blocage');
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Validate Transaction ──────────────────────────────────────

  async function handleValidate(tx: Transaction) {
    if (!admin?.id) {
      toast.error('Session admin invalide');
      return;
    }

    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: tx.id,
          adminId: admin.id,
          action: 'validate',
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Transaction validée avec succès');
        fetchTransactions(1, false);
      } else {
        toast.error(data.error || 'Échec de la validation');
      }
    } catch (err) {
      console.error('Validate error:', err);
      toast.error('Erreur lors de la validation');
    }
  }

  // ─── Cancel Transaction ────────────────────────────────────────

  async function handleCancel(tx: Transaction) {
    if (!admin?.id) {
      toast.error('Session admin invalide');
      return;
    }

    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: tx.id,
          adminId: admin.id,
          action: 'cancel',
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Transaction annulée avec succès');
        fetchTransactions(1, false);
      } else {
        toast.error(data.error || "Échec de l'annulation");
      }
    } catch (err) {
      console.error('Cancel error:', err);
      toast.error("Erreur lors de l'annulation");
    }
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Sticky Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' as const }}
        className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Retour</span>
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              Transactions
            </h1>
            <p className="text-xs text-muted-foreground">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} trouvée{transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-4">
        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
          className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        <Separator />

        {/* Transactions List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' as const }}
          >
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-base font-medium text-foreground mb-1">
                  Aucune transaction trouvée
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Aucune transaction ne correspond à ce filtre
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <div className="space-y-3">
              {transactions.map((tx, index) => {
                const typeConfig = getTypeConfig(tx.type);
                const statusConfig = getStatusConfig(tx.status);
                const TypeIcon = typeConfig.icon;

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03, ease: 'easeOut' as const }}
                  >
                    <Card className={`border-border hover:shadow-md transition-shadow ${
                      tx.status === 'blocked' ? 'border-red-200 dark:border-red-800/40' : ''
                    }`}>
                      <CardContent className="p-4">
                        {/* Top row: type + status + amount */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <Badge className={`text-xs font-medium ${typeConfig.color}`}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {typeConfig.label}
                            </Badge>
                            <Badge className={`text-xs font-medium ${statusConfig.color}`}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <span className="text-sm font-bold text-foreground shrink-0">
                            {formatAmount(tx.amount)}
                          </span>
                        </div>

                        {/* Sender / Receiver info */}
                        <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                            <span className="truncate">
                              {tx.senderName} · {tx.senderPhone}
                            </span>
                          </div>
                          {(tx.receiverName || tx.receiverPhone) && (
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              <span className="truncate">
                                {tx.receiverName || tx.receiverPhone}
                              </span>
                            </div>
                          )}
                          {tx.agentName && (
                            <div className="flex items-center gap-2">
                              <Tag className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Agent: {tx.agentName}</span>
                            </div>
                          )}
                          {tx.description && (
                            <p className="text-xs text-muted-foreground italic truncate mt-1">
                              {tx.description}
                            </p>
                          )}
                        </div>

                        <Separator className="my-2" />

                        {/* Bottom row: date + actions */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(tx.createdAt)}</span>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {tx.status === 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => navigateTo('receipt', { transactionId: tx.id })}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                Reçu
                              </Button>
                            )}
                            {tx.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => openBlockDialog(tx)}
                                >
                                  <ShieldBan className="h-3.5 w-3.5 mr-1" />
                                  Bloquer
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                  onClick={() => handleValidate(tx)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Valider
                                </Button>
                              </>
                            )}
                            {(tx.status === 'pending' || tx.status === 'completed') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-gray-500 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20"
                                onClick={() => handleCancel(tx)}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Annuler
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800/40 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Chargement...
                    </>
                  ) : (
                    'Charger plus'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Block Transaction Dialog ────────────────────────────── */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ShieldBan className="h-5 w-5" />
              Bloquer la transaction
            </DialogTitle>
            <DialogDescription>
              Voulez-vous bloquer cette transaction de{' '}
              <strong>{formatAmount(blockTarget?.amount ?? 0)}</strong> ?
              Cette action empêchera son traitement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="block-reason">Raison du blocage</Label>
              <Textarea
                id="block-reason"
                placeholder="Décrivez la raison du blocage..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
                className="bg-muted/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)} disabled={actionLoading}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlockSubmit}
              disabled={actionLoading || !blockReason.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Blocage...
                </>
              ) : (
                <>
                  <ShieldBan className="h-4 w-4 mr-2" />
                  Bloquer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
