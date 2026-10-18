'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MessageSquare,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { formatRemainingTime, remainingChatTime } from '@/lib/marketplace';

interface Conversation {
  id: string;
  offerId: string;
  offer: { id: string; title: string; status: string; category: string };
  createdAt: string;
  expiresAt: string;
  others: { id: string; name: string | null; pseudo: string | null }[];
  lastMessage: {
    id: string;
    senderId: string;
    content: string;
    hasImage: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
}

function formatWhen(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return date.toLocaleDateString('fr-FR');
}

export default function BarterChatsScreen() {
  const { goBack, navigateTo, user } = useAppStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/barter/chats');
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
        setLoadError('');
      } else {
        setLoadError(data.message || 'Erreur lors du chargement');
      }
    } catch {
      setLoadError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <MessageSquare className="size-5 text-emerald-600" />
            <h1 className="text-lg font-semibold">Mes discussions Troc</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-12">
          Les conversations expirent automatiquement après 48 h
        </p>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3 pb-24">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <MessageSquare className="size-10 text-muted-foreground opacity-40" />
            <p className="font-medium text-foreground">Impossible de charger vos discussions</p>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" className="mt-2" onClick={() => { setLoading(true); void fetchConversations(); }}>
              Réessayer
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg text-foreground">Aucune discussion</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              Ouvrez une offre de troc et proposez un échange pour démarrer une conversation.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigateTo('barter')}
            >
              Parcourir les offres
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {conversations.map((c, index) => {
              const other = c.others[0];
              const otherName = other?.name || other?.pseudo || 'Utilisateur';
              const remainingMs = remainingChatTime(c.createdAt);
              const preview = c.lastMessage
                ? c.lastMessage.hasImage && !c.lastMessage.content
                  ? '📷 Photo'
                  : (c.lastMessage.content || '📷 Photo').slice(0, 80)
                : 'Aucun message — dites bonjour !';
              const isUnreadFromOther =
                c.unreadCount > 0 && c.lastMessage?.senderId !== user?.id;

              return (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() =>
                    navigateTo('barter-detail', { offerId: c.offerId, chatId: c.id })
                  }
                  className={`w-full text-left bg-card border rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    isUnreadFromOther ? 'border-emerald-500/50' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">
                        {c.offer.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        avec {otherName}
                      </p>
                    </div>
                    {c.unreadCount > 0 && (
                      <Badge className="bg-emerald-600 text-white border-0 shrink-0">
                        {c.unreadCount}
                      </Badge>
                    )}
                  </div>

                  <p
                    className={`text-sm mt-2 line-clamp-2 ${
                      isUnreadFromOther ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {c.lastMessage?.senderId === user?.id && !c.lastMessage.hasImage ? 'Vous : ' : ''}
                    {preview}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-muted-foreground">
                      {c.lastMessage ? formatWhen(c.lastMessage.createdAt) : formatWhen(c.createdAt)}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Timer className="size-3" />
                      {remainingMs > 0 ? formatRemainingTime(remainingMs) : 'Expirée'}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
