'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Bot,
  ArrowLeftRight,
  DollarSign,
  ShoppingBag,
  Handshake,
  Ban,
  UserCheck,
  LogOut,
  Shield,
  Activity,
  Bell,
  ArrowRight,
  Clock,
  Gift,
  MessageSquare,
  Code,
  Globe,
  CreditCard,
  Mail,
  Store,
  FileCheck,
  Headphones,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAppStore, type PageName } from '@/lib/store';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  totalAgents: number;
  totalTransactions: number;
  totalVolume: number;
  totalProducts: number;
  totalBarterOffers: number;
  suspendedUsers: number;
  todayUsers: number;
  [key: string]: number;
}

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  adminName: string;
  createdAt: string;
}

interface StatCard {
  label: string;
  key: keyof DashboardStats;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const statsConfig: (StatCard & { page?: PageName })[] = [
  { label: 'Total Utilisateurs', key: 'totalUsers', icon: Users, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  { label: 'Total Agents', key: 'totalAgents', icon: Bot, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/40', page: 'admin-agents' },
  { label: 'Transactions', key: 'totalTransactions', icon: ArrowLeftRight, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  { label: 'Volume Total', key: 'totalVolume', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
  { label: 'Produits Market', key: 'totalProducts', icon: ShoppingBag, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/40' },
  { label: 'Offres Troc', key: 'totalBarterOffers', icon: Handshake, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/40' },
  { label: 'Comptes Suspendus', key: 'suspendedUsers', icon: Ban, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/40' },
  { label: 'Utilisateurs Aujourd\'hui', key: 'todayUsers', icon: UserCheck, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/40' },
  { label: 'Agents en attente', key: 'pendingAgents', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/40', page: 'admin-agents' },
  { label: 'Développeurs', key: 'approvedDevelopers', icon: Code, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-100 dark:bg-violet-900/40' },
  { label: 'Revenus API', key: 'totalApiCommission', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
];

interface QuickAction {
  label: string;
  page: PageName;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  { label: 'Gestion Utilisateurs', page: 'admin-users', icon: Users, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  { label: 'Gestion Agents', page: 'admin-agents', icon: Bot, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/40' },
  { label: 'Validation Services', page: 'admin-seller-validation', icon: UserCheck, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/40' },
  { label: 'Gestion Services', page: 'admin-sellers', icon: Store, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  { label: 'Cartes', page: 'admin-cards', icon: CreditCard, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/40' },
  { label: 'Demandes de Cartes', page: 'admin-card-requests', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/40' },
  { label: 'Transactions', page: 'admin-transactions', icon: ArrowLeftRight, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  { label: 'Market', page: 'admin-market', icon: ShoppingBag, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/40' },
  { label: 'Troc', page: 'admin-barter', icon: Handshake, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/40' },
  { label: 'Notifications', page: 'admin-notifications', icon: Bell, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
  { label: 'Gestion Bonus', page: 'admin-bonus', icon: Gift, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
  { label: 'Validation Agents', page: 'admin-agent-validation', icon: UserCheck, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/40' },
  { label: 'Messages Agents', page: 'admin-messages', icon: MessageSquare, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/40' },
  { label: 'Messages Clients', page: 'admin-client-messages', icon: Mail, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40' },
  { label: 'Développeurs', page: 'admin-developers', icon: Code, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-100 dark:bg-violet-900/40' },
  { label: 'Gestion Parrainage', page: 'admin-children', icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
  { label: 'Validation KYC', page: 'admin-kyc', icon: FileCheck, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/40' },
  { label: 'Support Client', page: 'admin-support', icon: Headphones, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/40' },
];

function formatStatValue(key: keyof DashboardStats, value: number): string {
  if (key === 'totalVolume') {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  }
  return value.toLocaleString('fr-FR');
}

function formatActivityDate(dateStr: string): string {
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
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminDashboard() {
  const { admin, navigateTo, adminLogout } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const statsRes = await fetch('/api/admin/stats');

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
          if (statsData.stats.recentLogs && Array.isArray(statsData.stats.recentLogs)) {
            setActivityLogs(statsData.stats.recentLogs.map((log: any) => ({
              id: log.id,
              action: log.action,
              details: log.details || '',
              adminName: log.admin?.name || 'Admin',
              createdAt: log.createdAt,
            })));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  function handleLogout() {
    adminLogout();
    toast.success('Déconnexion réussie');
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
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                Tableau de Bord
              </h1>
              <p className="text-xs text-muted-foreground">
                {admin?.name || 'Admin'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Déconnexion
          </Button>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-6">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' as const }}
        >
          <h2 className="text-base font-semibold text-foreground mb-3">
            Statistiques
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 11 }).map((_, i) => (
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statsConfig.map((stat, index) => {
                const Icon = stat.icon;
                const value = stats?.[stat.key] ?? 0;
                const isClickable = !!stat.page;
                return (
                  <motion.div
                    key={stat.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' as const }}
                  >
                    <Card
                      className={`border-border hover:shadow-md transition-shadow ${
                        isClickable ? 'cursor-pointer hover:border-amber-300 dark:hover:border-amber-700' : ''
                      }`}
                      onClick={isClickable && stat.page ? () => navigateTo(stat.page!) : undefined}
                    >
                      <CardContent className="p-4">
                        <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                        <p className="text-xl font-bold text-foreground leading-tight">
                          {formatStatValue(stat.key, value)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.label}
                          {isClickable && (
                            <span className="text-amber-600 dark:text-amber-400 ml-1">→</span>
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' as const }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">
              Activité Récente
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
              onClick={() => navigateTo('admin-activity-log')}
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
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune activité récente
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-96 overflow-y-auto">
                  {activityLogs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03, ease: 'easeOut' as const }}
                      className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {log.action}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {log.details}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          par {log.adminName}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatActivityDate(log.createdAt)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <Separator className="my-2" />

        {/* Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' as const }}
        >
          <h2 className="text-base font-semibold text-foreground mb-3">
            Accès Rapide
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.page}
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
      </div>
    </div>
  );
}
