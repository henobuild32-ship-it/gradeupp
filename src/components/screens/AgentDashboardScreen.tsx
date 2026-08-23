'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, ShieldCheck, Activity, TrendingUp, DollarSign, Users, Clock, XCircle, Loader2, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

export default function AgentDashboardScreen() {
  const { goBack, user, setUser, navigateTo, unreadCount } = useAppStore();
  const { t } = useTranslation();
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [agentStats, setAgentStats] = useState({ depositsToday: 0, withdrawalsValidated: 0, activeClients: 0, totalVolume: 0 });

  const validationStatus = user?.validationStatus;
  const isSuspended = user?.suspended === true;

  // Fetch real agent stats
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/agent/activity?agentId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.activity) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split('T')[0];

          const depositsToday = data.activity
            .filter((a: any) => a.type === 'deposit' && a.status === 'completed' && new Date(a.createdAt).toISOString().startsWith(todayStr))
            .reduce((sum: number, a: any) => sum + (a.currency === 'FC' ? 0 : a.amount), 0);

          const withdrawalsValidated = data.activity
            .filter((a: any) => a.type === 'withdrawal' && a.status === 'completed')
            .length;

          const uniqueClients = new Set(data.activity.map((a: any) => a.clientPhone));

          const totalVolume = data.activity
            .filter((a: any) => a.status === 'completed')
            .reduce((sum: number, a: any) => sum + (a.currency === 'FC' ? 0 : a.amount), 0);

          setAgentStats({
            depositsToday,
            withdrawalsValidated,
            activeClients: uniqueClients.size,
            totalVolume,
          });
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          toast.info(t('agent.status_updated'));
        }
      } else {
        toast.error(t('agent.status_error'));
      }
    } catch {
      toast.error(t('validation.connection_error'));
    } finally {
      setCheckingStatus(false);
    }
  };

  // Blocking overlay for pending validation
  if (validationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-amber-50 dark:bg-amber-950/30 flex flex-col">
        <header className="sticky top-0 z-10 bg-amber-100/80 dark:bg-amber-950/80 backdrop-blur-md border-b border-amber-200 dark:border-amber-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0D5C63] to-[#DC2626] flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <h1 className="text-lg font-semibold">{t('agent.dashboard')}</h1>
              <Badge className="bg-amber-200 text-amber-800 border-amber-300 text-xs">
                Agent
              </Badge>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-20 h-20 rounded-full bg-amber-200 dark:bg-amber-800/60 flex items-center justify-center mx-auto mb-6">
              <Clock className="size-10 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-3">
              {t('agent.pending_validation')}
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed mb-8">
              {t('agent.pending_validation_desc')}
            </p>
            <Button
              onClick={handleCheckStatus}
              disabled={checkingStatus}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl px-8 h-11 cursor-pointer"
            >
              {checkingStatus ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              {t('agent.check_status')}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Blocking overlay for rejected validation
  if (validationStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-950/30 flex flex-col">
        <header className="sticky top-0 z-10 bg-red-100/80 dark:bg-red-950/80 backdrop-blur-md border-b border-red-200 dark:border-red-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0D5C63] to-[#DC2626] flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <h1 className="text-lg font-semibold">{t('agent.dashboard')}</h1>
              <Badge className="bg-red-200 text-red-800 border-red-300 text-xs">
                Agent
              </Badge>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-20 h-20 rounded-full bg-red-200 dark:bg-red-800/60 flex items-center justify-center mx-auto mb-6">
              <XCircle className="size-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-3">
              {t('agent.rejected')}
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
              {t('agent.rejected_reason')} {user?.validationRejectReason || 'N/A'}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Blocking overlay for suspended account
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-950/30 flex flex-col">
        <header className="sticky top-0 z-10 bg-red-100/80 dark:bg-red-950/80 backdrop-blur-md border-b border-red-200 dark:border-red-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0D5C63] to-[#DC2626] flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <h1 className="text-lg font-semibold">{t('agent.dashboard')}</h1>
              <Badge className="bg-red-200 text-red-800 border-red-300 text-xs">
                Agent
              </Badge>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-20 h-20 rounded-full bg-red-200 dark:bg-red-800/60 flex items-center justify-center mx-auto mb-6">
              <XCircle className="size-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-3">
              {t('agent.suspended')}
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
              {t('agent.suspended_desc')}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: t('agent.deposits_today'),
      value: `$${agentStats.depositsToday.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-[#0D5C63]',
      bg: 'bg-blue-50',
    },
    {
      label: t('agent.withdrawals_validated'),
      value: agentStats.withdrawalsValidated.toString(),
      icon: ShieldCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: t('agent.active_clients'),
      value: agentStats.activeClients.toString(),
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: t('agent.total_volume'),
      value: `$${agentStats.totalVolume.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-[#DC2626]',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0D5C63] to-[#DC2626] flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{t('agent.dashboard')}</h1>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
              Agent
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigateTo('notifications')} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-5 pb-8">
        {/* Agent info card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-0">
            <CardContent className="p-5">
              <p className="text-sm text-amber-100">{t('agent.agent_code')}</p>
              <p className="text-3xl font-bold font-mono tracking-wider mt-1">
                {(() => { const c = user?.agentCode || user?.agentNumber; return c ? (c.startsWith('AGT-') ? c : `AGT-${c}`) : 'N/A'; })()}
              </p>
              <p className="text-sm text-amber-200 mt-2">
                {user?.name || 'Agent'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className={`w-9 h-9 rounded-full ${stat.bg} flex items-center justify-center mb-3`}>
                      <Icon className={`size-4 ${stat.color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold mt-1">{stat.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('agent.quick_actions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 text-[#0D5C63] border-blue-200 hover:bg-blue-50 cursor-pointer"
                onClick={() => navigateTo('agent-deposit')}
              >
                <UserPlus className="size-4" />
                {t('action.agent_deposit')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 text-amber-700 border-amber-200 hover:bg-amber-50 cursor-pointer"
                onClick={() => navigateTo('agent-withdraw-validate')}
              >
                <ShieldCheck className="size-4" />
                {t('action.agent_validate')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 text-violet-600 border-violet-200 hover:bg-violet-50 cursor-pointer"
                onClick={() => navigateTo('agent-activity')}
              >
                <Activity className="size-4" />
                {t('action.agent_activity')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
