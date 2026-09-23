'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Send,
  Bell,
  Megaphone,
  AlertTriangle,
  Wrench,
  Gift,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';

interface GlobalNotification {
  id: string;
  adminId: string;
  title: string;
  message: string;
  type: string;
  sentToAll: boolean;
  createdAt: string;
  admin: { name: string; username: string } | null;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  announcement: { icon: Megaphone, color: 'bg-emerald-100 text-emerald-700', label: 'Annonce' },
  alert: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-700', label: 'Alerte' },
  maintenance: { icon: Wrench, color: 'bg-blue-100 text-blue-700', label: 'Maintenance' },
  promo: { icon: Gift, color: 'bg-purple-100 text-purple-700', label: 'Promotion' },
  general: { icon: Bell, color: 'bg-muted text-muted-foreground', label: 'Général' },
};

function formatTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminNotificationsScreen() {
  const { goBack, admin } = useAppStore();
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'announcement',
  });

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Titre et message requis');
      return;
    }
    if (!admin?.id) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          title: formData.title.trim(),
          message: formData.message.trim(),
          type: formData.type,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Notification envoyée');
        setShowCreateDialog(false);
        setFormData({ title: '', message: '', type: 'announcement' });
        fetchNotifications();
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

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
            <h1 className="text-lg font-semibold">Notifications</h1>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline ml-1">Envoyer</span>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-12">
          Gérez les notifications globales
        </p>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">Aucune notification</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Aucune notification globale envoyée pour le moment
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((notif, index) => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
                const Icon = config.icon;
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                              <Icon className="size-4" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm">{notif.title}</h3>
                              <Badge variant="outline" className="text-[10px] mt-0.5">
                                {config.label}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(notif.createdAt)}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {notif.message}
                        </p>

                        {notif.admin && (
                          <p className="text-xs text-muted-foreground">
                            Envoyée par {notif.admin.name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Notification Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-5 text-emerald-600" />
              Envoyer une notification
            </DialogTitle>
            <DialogDescription>
              Cette notification sera envoyée à tous les utilisateurs actifs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="notif-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type de notification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">📢 Annonce</SelectItem>
                  <SelectItem value="alert">⚠️ Alerte</SelectItem>
                  <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                  <SelectItem value="promo">🎁 Promotion</SelectItem>
                  <SelectItem value="general">🔔 Général</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-title">Titre</Label>
              <Input
                id="notif-title"
                placeholder="Titre de la notification"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-message">Message</Label>
              <Textarea
                id="notif-message"
                placeholder="Contenu de la notification..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !formData.title.trim() || !formData.message.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {sending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="size-4 mr-2" />
                  Envoyer à tous
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
