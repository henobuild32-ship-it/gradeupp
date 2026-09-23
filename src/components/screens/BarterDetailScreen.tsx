'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Send,
  Loader2,
  User,
  Tag,
  MessageSquare,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';

const CATEGORY_COLORS: Record<string, string> = {
  service: 'bg-amber-100 text-amber-700 border-amber-200',
  product: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  skill: 'bg-violet-100 text-violet-700 border-violet-200',
};

interface BarterOffer {
  id: string;
  title: string;
  description: string;
  category: string;
  offeredBy: string;
  wantedItem: string | null;
  status: string;
  createdAt: string;
  user: { id: string; name: string; pseudo: string; phone: string } | null;
}

interface BarterMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export default function BarterDetailScreen() {
  const { goBack, pageParams, user } = useAppStore();
  const offerId = pageParams.offerId as string;

  const [offer, setOffer] = useState<BarterOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [messages, setMessages] = useState<BarterMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingOffer, setUpdatingOffer] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateOfferStatus = async (action: 'accept' | 'reject' | 'cancel') => {
    if (!offerId) return;
    setUpdatingOffer(action);
    try {
      const res = await fetch('/api/barter/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ offerId, action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          action === 'accept'
            ? 'Échange accepté'
            : action === 'reject'
              ? 'Échange refusé'
              : 'Offre annulée'
        );
        setOffer((prev) => (prev ? { ...prev, status: data.offer.status } : prev));
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setUpdatingOffer(null);
    }
  };

  // Fetch offer details
  useEffect(() => {
    if (!offerId) {
      goBack();
      return;
    }

    async function fetchOffer() {
      try {
        const res = await fetch('/api/barter/offers');
        const data = await res.json();
        if (data.success) {
          const found = data.offers.find(
            (o: BarterOffer) => o.id === offerId
          );
          if (found) {
            setOffer(found);
          } else {
            toast.error('Offre introuvable');
            goBack();
          }
        }
      } catch {
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }

    fetchOffer();
  }, [offerId, goBack]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for messages every 3 seconds
  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/barter/chat?chatId=${chatId}`);
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages);
        }
      } catch {
        // silently fail for polling
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [chatId]);

  const startChat = async () => {
    if (!offer || !user) return;

    setCreatingChat(true);
    try {
      const res = await fetch('/api/barter/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offer.id,
          initiatedBy: user.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChatId(data.chat.id);
        toast.success('Chat créé ! Vous pouvez maintenant échanger.');
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setCreatingChat(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const res = await fetch('/api/barter/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          senderId: user.id,
          content,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id,
            chatId,
            senderId: user.id,
            content,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        toast.error(data.message || 'Erreur');
        setNewMessage(content);
      }
    } catch {
      toast.error('Erreur de connexion');
      setNewMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </header>
        <div className="flex-1 px-4 py-4 space-y-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (!offer) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-semibold truncate">{offer.title}</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        {/* Offer details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            <Badge
              variant="outline"
              className={CATEGORY_COLORS[offer.category] || 'bg-muted'}
            >
              {offer.category}
            </Badge>
            <span className="text-sm text-muted-foreground">
              par{' '}
              {offer.user?.name || offer.user?.pseudo || 'Anonyme'}
            </span>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {offer.description}
          </p>

          {offer.wantedItem && (
            <div className="flex items-center gap-2 text-sm">
              <Tag className="size-4 text-emerald-600" />
              <span className="text-muted-foreground">Recherche : </span>
              <span className="font-medium text-emerald-700">
                {offer.wantedItem}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                offer.status === 'accepted'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : offer.status === 'rejected' || offer.status === 'cancelled'
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
              }
            >
              {offer.status === 'active'
                ? 'Active'
                : offer.status === 'accepted'
                  ? 'Acceptée'
                  : offer.status === 'rejected'
                    ? 'Refusée'
                    : 'Annulée'}
            </Badge>
          </div>

          {user?.id === offer.offeredBy && offer.status === 'active' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={() => updateOfferStatus('accept')}
                disabled={updatingOffer}
              >
                {updatingOffer === 'accept' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Accepter'
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => updateOfferStatus('reject')}
                disabled={updatingOffer}
              >
                {updatingOffer === 'reject' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Refuser'
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-muted-foreground"
                onClick={() => updateOfferStatus('cancel')}
                disabled={updatingOffer}
              >
                {updatingOffer === 'cancel' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Annuler'
                )}
              </Button>
            </div>
          )}

          <Separator />

          {!chatId && offer.status === 'active' && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={startChat}
              disabled={creatingChat}
            >
              {creatingChat ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Création du chat...
                </>
              ) : (
                <>
                  <MessageSquare className="size-4" />
                  Proposer un échange
                </>
              )}
            </Button>
          )}
        </motion.div>

        {/* Chat section */}
        {chatId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex-1 flex flex-col border-t bg-muted/30"
          >
            <div className="px-4 py-2 border-b bg-background">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-emerald-600" />
                <span className="text-sm font-medium">Conversation</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[400px]">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Aucun message. Dites bonjour !
                </div>
              )}

              {messages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        isMine
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-card border rounded-bl-md'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isMine
                            ? 'text-emerald-100'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="px-4 py-3 border-t bg-background">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  ref={inputRef}
                  placeholder="Écrire un message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  disabled={sending || !newMessage.trim()}
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
