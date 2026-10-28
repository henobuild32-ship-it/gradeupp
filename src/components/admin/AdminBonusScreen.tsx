'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Gift,
  Plus,
  Megaphone,
  Ban,
  History,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Users,
  Loader2,
  ArrowRight,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface BonusStats {
  totalDistributed: number;
  totalUsed: number;
  totalRemaining: number;
  activeCampaigns: number;
}

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

interface TopBonusUser {
  id: string;
  name: string;
  phone: string;
  totalBonusReceived: number;
  currency: string;
}

function formatAmount(amount: number, currency: string): string {
  const prefix = currency === 'USD' ? '$' : '';
  if (currency === 'FC') {
    return `${amount.toLocaleString('fr-FR')} CDF`;
  }
  return `${prefix}${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatStatAmount(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return formatDate(dateStr);
}

const statCards = [
  { key: 'totalDistributed', label: 'Total Distribué', icon: Gift, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
  { key: 'totalUsed', label: 'Total Utilisé', icon: TrendingDown, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/40' },
  { key: 'totalRemaining', label: 'Total Restant', icon: Wallet, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/40' },
  { key: 'activeCampaigns', label: 'Campagnes Actives', icon: Megaphone, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
];

export default function AdminBonusScreen() {
  const { goBack, navigateTo } = useAppStore();
  const [stats, setStats] = useState<BonusStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<BonusHistoryItem[]>([]);
  const [topUsers, setTopUsers] = useState<TopBonusUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBonusData = useCallback(async () => {
    setLoading(true);
    try {
      const statsRes = await fetch('/api/bonus/stats');

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
          setRecentActivity(statsData.history || []);
          if (statsData.topUsers) {
            setTopUsers(statsData.topUsers);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch bonus data:', err);
      toast.error('Erreur lors du chargement des données bonus');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBonusData();
  }, [fetchBonusData]);

  const quickActions = [
    { label: 'Ajouter un bonus', icon: Plus, page: 'admin-bonus-adjust' as const, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
    { label: 'Créer une campagne', icon: Megaphone, page: 'admin-bonus-campaigns' as const, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
    { label: 'Bloquer un bonus', icon: Ban, page: 'admin-bonus-adjust' as const, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/40' },
    { label: 'Voir l\'historique', icon: History, page: 'admin-bonus-history' as const, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  ];

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
              <Gift className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                Gestion Bonus
              </h1>
              <p className="text-xs text-muted-foreground">
                Centre de gestion des bonus
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-5">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' as const }}
        >
          <h2 className="text-base font-semibold text-foreground mb-3">
            Statistiques
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="p-4">
                    <Skeleton className="h-8 w-8 rounded-lg mb-3" />
                    <Skeleton className="h-6 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                const raw = stats?.[stat.key as keyof BonusStats] ?? 0;
                const value = typeof raw === 'number' ? raw : 0;
                return (
                  <motion.div
                    key={stat.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' as const }}
                  >
                    <Card className="border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                        <p className="text-xl font-bold text-foreground leading-tight">
                          {stat.key === 'activeCampaigns' ? value : formatStatAmount(value)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.label}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' as const }}
        >
          <h2 className="text-base font-semibold text-foreground mb-3">
            Actions Rapides
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' as const }}
                >
                  <Card
                    className="border-border hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigateTo(action.page)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${action.bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight">
                          {action.label}
                        </p>
                        <ArrowRight className="h-3 w-3 text-muted-foreground mt-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <Separator />

        {/* Top Bonus Users */}
        {!loading && topUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' as const }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Top Utilisateurs Bonus
              </h2>
            </div>
            <Card className="border-border">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {topUsers.slice(0, 5).map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' as const }}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        index === 0
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                          : index === 1
                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            : index === 2
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                              : 'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.phone}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatAmount(user.totalBonusReceived, user.currency)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Bonus Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' as const }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              Activité Récente
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
              onClick={() => navigateTo('admin-bonus-history')}
            >
              Voir tout
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <Card className="border-border">
            <CardContent className="p-0">
              {loading ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Gift className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune activité bonus récente
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-96 overflow-y-auto">
                  {recentActivity.map((item, index) => {
                    const isPositive = item.amount > 0;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03, ease: 'easeOut' as const }}
                        className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isPositive
                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                            : 'bg-red-100 dark:bg-red-900/40'
                        }`}>
                          {isPositive ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.userName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {item.description || item.type}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-semibold ${
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isPositive ? '+' : ''}{formatAmount(item.amount, item.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeDate(item.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
