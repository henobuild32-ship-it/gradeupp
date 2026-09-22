'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Bell,
  DollarSign,
  Shield,
  Gift,
  AlertCircle,
  ShoppingBag,
  MessageSquare,
  CheckCheck,
  BellOff,
  Copy,
  Check,
  Megaphone,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAppStore, type Notification } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  transaction: DollarSign,
  transfer_received: DollarSign,
  transfer_sent: DollarSign,
  withdrawal_validated: DollarSign,
  security: Shield,
  promo: Gift,
  system: AlertCircle,
  purchase: ShoppingBag,
  barter_accepted: MessageSquare,
  card_approved: CreditCard,
  card_rejected: CreditCard,
  card_suspended: CreditCard,
  admin_message: MessageSquare,
  card_payment: CreditCard,
  default: Bell,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  transaction: 'bg-emerald-100 text-emerald-600',
  transfer_received: 'bg-emerald-100 text-emerald-600',
  transfer_sent: 'bg-amber-100 text-amber-600',
  withdrawal_validated: 'bg-emerald-100 text-emerald-600',
  security: 'bg-red-100 text-red-600',
  promo: 'bg-violet-100 text-violet-600',
  system: 'bg-muted text-muted-foreground',
  purchase: 'bg-emerald-100 text-emerald-600',
  barter_accepted: 'bg-amber-100 text-amber-600',
  card_approved: 'bg-sky-100 text-sky-600',
  card_rejected: 'bg-red-100 text-red-600',
  card_suspended: 'bg-amber-100 text-amber-600',
  admin_message: 'bg-indigo-100 text-indigo-600',
  card_payment: 'bg-emerald-100 text-emerald-600',
  default: 'bg-muted text-muted-foreground',
};

interface AdminMessage {
  id: string;
  title: string;
  message: string;
  type: string;
  allowCopy: boolean;
  isRead: boolean;
  createdAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "il y a l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

export default function NotificationsScreen() {
  const { goBack, user, setNotifications, markAsRead } = useAppStore();
  const { t, language } = useTranslation();
  const [notifications, setLocalNotifications] = useState<Notification[]>([]);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch(
        `/api/notifications?userId=${user.id}`
      );
      const data = await res.json();

      if (data.success) {
        const mapped: Notification[] = (data.notifications ?? []).map(
          (n: {
            id: string;
            title: string;
            message: string;
            type: string;
            read: boolean;
            createdAt: string;
          }) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type as Notification['type'],
            read: n.read,
            createdAt: n.createdAt,
          })
        );
        setLocalNotifications(mapped);
        setNotifications(mapped);
      }
    } catch {
      toast.error(t('notifications.load_error'));
    }
  }, [user, setNotifications]);

  const fetchAdminMessages = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/client-messages?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setAdminMessages(data.messages || []);
      }
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    Promise.all([fetchNotifications(), fetchAdminMessages()]).finally(() => {
      setLoading(false);
    });
  }, [fetchNotifications, fetchAdminMessages]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      markAsRead(id);
      setLocalNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // silent fail
    }
  };

  const handleMarkAdminMessageAsRead = async (msgId: string) => {
    if (!user) return;
    try {
      await fetch('/api/client-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, messageId: msgId }),
      });
      setAdminMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isRead: true } : m))
      );
    } catch {
      // silent fail
    }
  };

  const handleCopyMessage = async (msg: AdminMessage) => {
    try {
      await navigator.clipboard.writeText(msg.message);
      setCopiedId(msg.id);
      toast.success(t('notifications.copied'));
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error(t('notifications.copy_error'));
    }
  };

  const handleMarkAll = async () => {
    if (!user) return;

    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications/mark-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();

      if (data.success) {
        setLocalNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
        toast.success(t('notifications.marked_all', { count: data.markedCount }));
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length + adminMessages.filter((m) => !m.isRead).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Bell className="size-5 text-emerald-600" />
            <h1 className="text-lg font-semibold">{t('nav.notifications')}</h1>
            {unreadCount > 0 && (
              <Badge className="bg-emerald-600 text-white border-0">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAll}
            disabled={markingAll || unreadCount === 0}
            className="text-emerald-600 text-xs"
          >
            <CheckCheck className="size-4" />
            {t('notifications.mark_all')}
          </Button>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-8 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 && adminMessages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BellOff className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">{t('notifications.empty_title')}</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {t('notifications.empty_desc')}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Admin Messages Section */}
            {adminMessages.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="size-4 text-indigo-500" />
                  {t('notifications.admin_messages')}
                  {adminMessages.some((m) => !m.isRead) && (
                    <Badge className="bg-indigo-600 text-white border-0 text-[10px]">
                      {adminMessages.filter((m) => !m.isRead).length} nouveau(x)
                    </Badge>
                  )}
                </h2>
                <div className="space-y-2">
                  {adminMessages.map((msg, index) => {
                    const isBroadcast = msg.type === 'broadcast';
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`rounded-xl border transition-colors p-3.5 ${
                          !msg.isRead
                            ? 'bg-indigo-50/50 border-indigo-200/60 dark:bg-indigo-950/20 dark:border-indigo-800/40'
                            : 'bg-card border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isBroadcast
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                              : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                          }`}>
                            {isBroadcast ? (
                              <Megaphone className="size-5" />
                            ) : (
                              <MessageSquare className="size-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className={`text-sm font-medium leading-tight ${
                                    !msg.isRead ? '' : 'text-muted-foreground'
                                  }`}>
                                    {msg.title}
                                  </h3>
                                  {isBroadcast && (
                                    <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-600 shrink-0">
                                      Annonce
                                    </Badge>
                                  )}
                                </div>
                                {!msg.isRead && (
                                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                              {msg.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-muted-foreground/70">
                                {formatRelativeTime(msg.createdAt)}
                              </p>
                              {msg.allowCopy && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                                  onClick={() => handleCopyMessage(msg)}
                                >
                                  {copiedId === msg.id ? (
                                    <>
                                      <Check className="size-3.5 mr-1" />
                                      Copié
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="size-3.5 mr-1" />
                                      Copier
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Standard Notifications */}
            {notifications.length > 0 && (
              <section>
                {adminMessages.length > 0 && (
                  <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Bell className="size-4 text-emerald-500" />
                    Activité
                  </h2>
                )}
                <div className="space-y-1">
                  <AnimatePresence>
                    {notifications.map((notif, index) => {
                      const Icon =
                        NOTIFICATION_ICONS[notif.type] ||
                        NOTIFICATION_ICONS.default;
                      const colorClass =
                        NOTIFICATION_COLORS[notif.type] ||
                        NOTIFICATION_COLORS.default;

                      return (
                        <motion.button
                          key={notif.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => {
                            if (!notif.read) handleMarkAsRead(notif.id);
                          }}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left ${
                            notif.read
                              ? 'hover:bg-muted/50'
                              : 'bg-emerald-50/50 hover:bg-emerald-50'
                          }`}
                        >
                          {/* Icon */}
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}
                          >
                            <Icon className="size-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3
                                className={`text-sm font-medium leading-tight ${
                                  notif.read ? 'text-muted-foreground' : ''
                                }`}
                              >
                                {notif.title}
                              </h3>
                              {!notif.read && (
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              {formatRelativeTime(notif.createdAt)}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
