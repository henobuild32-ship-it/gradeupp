'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Loader2,
  History,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Gift,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface BonusHistoryItem {
  id: string;
  userId: string;
  userName: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

function formatAmount(amount: number, currency: string): string {
  if (currency === 'FC') {
    return `${amount.toLocaleString('fr-FR')} CDF`;
  }
  return `$${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const typeOptions = [
  { value: 'all', label: 'Tous les types' },
  { value: 'admin_add', label: 'Ajout Admin' },
  { value: 'admin_remove', label: 'Retrait Admin' },
  { value: 'campaign', label: 'Campagne' },
  { value: 'signup_bonus', label: 'Bonus Inscription' },
  { value: 'referral_bonus', label: 'Bonus Parrainage' },
  { value: 'transaction_bonus', label: 'Bonus Transaction' },
  { value: 'used', label: 'Utilisé' },
];

export default function AdminBonusHistoryScreen() {
  const { goBack } = useAppStore();
  const [history, setHistory] = useState<BonusHistoryItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  const [filterUserId, setFilterUserId] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchHistory = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (filterUserId.trim()) params.set('userId', filterUserId.trim());
      if (filterType) params.set('type', filterType);

      const res = await fetch(`/api/bonus/history?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setHistory(data.history || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  }, [filterUserId, filterType]);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchHistory(newPage);
  }

  function handleApplyFilters() {
    fetchHistory(1);
  }

  function handleClearFilters() {
    setFilterUserId('');
    setFilterType('');
  }

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
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Retour</span>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <History className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                Historique Bonus
              </h1>
              <p className="text-xs text-muted-foreground">
                {pagination.total} enregistrement{pagination.total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-4">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
        >
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Filtres</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">ID Utilisateur</Label>
                  <Input
                    type="text"
                    placeholder="Rechercher par ID..."
                    value={filterUserId}
                    onChange={(e) => setFilterUserId(e.target.value)}
                    className="bg-muted/50 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
                    <SelectTrigger className="bg-muted/50 h-9">
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleApplyFilters}
                >
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  Appliquer
                </Button>
                {(filterUserId || filterType) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearFilters}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Effacer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* History Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' as const }}
        >
          <Card className="border-border">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Gift className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-base font-medium text-foreground mb-1">
                    Aucun historique trouvé
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    Essayez de modifier vos critères de filtre
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(item.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium text-foreground">{item.userName}</p>
                                <p className="text-xs text-muted-foreground">{item.userId.slice(0, 8)}...</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`text-sm font-semibold ${
                                item.amount > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {item.amount > 0 ? '+' : ''}{formatAmount(item.amount, item.currency)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {item.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card Layout */}
                  <div className="md:hidden divide-y divide-border">
                    {history.map((item, index) => {
                      const isPositive = item.amount > 0;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02, ease: 'easeOut' as const }}
                          className="p-4"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {item.userName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(item.createdAt)}
                              </p>
                            </div>
                            <span className={`text-sm font-semibold shrink-0 ${
                              isPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {isPositive ? '+' : ''}{formatAmount(item.amount, item.currency)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {item.type}
                            </Badge>
                            {item.description && (
                              <span className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between p-4">
                        <p className="text-xs text-muted-foreground">
                          Page {pagination.page} sur {pagination.totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1 || loading}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Précédent</span>
                          </Button>

                          {/* Page Numbers */}
                          {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                            let pageNum: number;
                            if (pagination.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (pagination.page <= 3) {
                              pageNum = i + 1;
                            } else if (pagination.page >= pagination.totalPages - 2) {
                              pageNum = pagination.totalPages - 4 + i;
                            } else {
                              pageNum = pagination.page - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === pagination.page ? 'default' : 'outline'}
                                size="icon"
                                className={`h-8 w-8 text-xs ${
                                  pageNum === pagination.page
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : ''
                                }`}
                                onClick={() => handlePageChange(pageNum)}
                                disabled={loading}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages || loading}
                          >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Suivant</span>
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
