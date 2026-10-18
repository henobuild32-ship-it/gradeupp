'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Send,
  Loader2,
  Tag,
  MessageSquare,
  Timer,
  ImagePlus,
  MoreVertical,
  ShieldAlert,
  Flag,
  Ban,
  Check,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import ProductImagePicker from '@/components/marketplace/ProductImagePicker';
import {
  BARTER_CHAT_TTL_MS,
  formatRemainingTime,
  remainingChatTime,
} from '@/lib/marketplace';

const CATEGORY_COLORS: Record<string, string> = {
  service: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  product: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  skill: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
};

interface BarterOffer {
  id: string;
  title: string;
  description: string;
  category: string;
  offeredBy: string;
  wantedItem: string | null;
  images: string | null;
  status: string;
  createdAt: string;
  user: { id: string; name: string; pseudo: string; phone: string } | null;
}

interface BarterMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  image: string | null;
  readAt: string | null;
  createdAt: string;
}

interface ChatInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
  participants: { id: string; name: string | null; pseudo: string | null }[];
}

export default function BarterDetailScreen() {
  const { goBack, pageParams, user } = useAppStore();
  const offerId = pageParams.offerId as string;
  const initialChatId = pageParams.chatId as string | undefined;

  const [offer, setOffer] = useState<BarterOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [chatId, setChatId] = useState<string | null>(initialChatId || null);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [messages, setMessages] = useState<BarterMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const [chatPhoto, setChatPhoto] = useState<string[]>([]);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [updatingOffer, setUpdatingOffer] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const otherUserId = offer
    ? user?.id === offer.offeredBy
      ? (chatInfo?.participants.find((p) => p.id !== user?.id)?.id ?? '')
      : offer.offeredBy
    : '';

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
            toast.error('Offre introuvable ou expirée');
            goBack();
          }
        } else {
          setLoadError(data.message || 'Erreur lors du chargement');
        }
      } catch {
        setLoadError('Erreur réseau lors du chargement');
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

  // Countdown ticker
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Poll for messages every 3 seconds
  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const res = await fetch(`/api/barter/chat?chatId=${chatId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        if (data.chat) setChatInfo(data.chat);
      }
    } catch {
      // silently fail for polling
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    void fetchMessages();
    const interval = setInterval(() => void fetchMessages(), 3000);
    return () => clearInterval(interval);
  }, [chatId, fetchMessages]);

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
        toast.success('Discussion ouverte ! Disponible pendant 48 h.');
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
            image: null,
            readAt: null,
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

  const sendPhoto = async () => {
    if (chatPhoto.length === 0 || !chatId || !user) return;
    setSendingPhoto(true);
    try {
      const res = await fetch('/api/barter/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          senderId: user.id,
          image: chatPhoto[0],
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
            content: '',
            image: data.message.image,
            readAt: null,
            createdAt: new Date().toISOString(),
          },
        ]);
        setChatPhoto([]);
        setShowPhotoPicker(false);
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setSendingPhoto(false);
    }
  };

  const blockUser = async () => {
    if (!otherUserId) return;
    try {
      const res = await fetch('/api/barter/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block', userId: otherUserId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Utilisateur bloqué. Vous ne recevrez plus ses messages.');
        goBack();
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const reportUser = async () => {
    if (!reportReason.trim()) return;
    setReporting(true);
    try {
      const targetId = otherUserId || offer?.offeredBy || '';
      const res = await fetch('/api/barter/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report',
          targetType: 'user',
          targetId,
          reason: reportReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Signalement enregistré. Notre équipe va examiner le cas.');
        setReportOpen(false);
        setReportReason('');
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setReporting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const chatCreatedAt = chatInfo ? new Date(chatInfo.createdAt).getTime() : null;
  const remainingMs = chatCreatedAt !== null ? remainingChatTime(chatCreatedAt) : BARTER_CHAT_TTL_MS;
  const expired = chatCreatedAt !== null && remainingMs <= 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
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

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="text-lg font-semibold">Troc</h1>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <ShieldAlert className="size-10 text-red-500" />
          <p className="font-medium text-foreground">Impossible de charger l&apos;offre</p>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={goBack}>Retour</Button>
        </div>
      </div>
    );
  }

  if (!offer) return null;

  const offerImages: string[] = (() => {
    if (!offer.images) return [];
    try {
      const parsed = JSON.parse(offer.images);
      return Array.isArray(parsed) ? parsed.filter((i) => typeof i === 'string') : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{offer.title}</h1>
            {chatId && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Timer className="size-3" />
                {expired ? 'Conversation expirée' : `Expire dans ${formatRemainingTime(remainingMs)}`}
              </p>
            )}
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Options"
            >
              <MoreVertical className="size-5" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-20">
                <button
                  onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent cursor-pointer"
                >
                  <Flag className="size-4 text-amber-500" />
                  Signaler l&apos;utilisateur
                </button>
                <button
                  onClick={() => { setMenuOpen(false); void blockUser(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-accent cursor-pointer"
                >
                  <Ban className="size-4" />
                  Bloquer l&apos;utilisateur
                </button>
              </div>
            )}
          </div>
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
              className={CATEGORY_COLORS[offer.category] || 'bg-muted text-muted-foreground border-border'}
            >
              {offer.category}
            </Badge>
            <span className="text-sm text-muted-foreground">
              par{' '}
              {offer.user?.name || offer.user?.pseudo || 'Anonyme'}
            </span>
          </div>

          {offerImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {offerImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Offre ${i + 1}`}
                  className="w-24 h-24 rounded-xl object-cover border border-border shrink-0"
                />
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground leading-relaxed">
            {offer.description}
          </p>

          {offer.wantedItem && (
            <div className="flex items-center gap-2 text-sm">
              <Tag className="size-4 text-emerald-600" />
              <span className="text-muted-foreground">Recherche : </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {offer.wantedItem}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                offer.status === 'accepted'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                  : offer.status === 'rejected' || offer.status === 'cancelled'
                    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30'
                    : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
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
                className="flex-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
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
                className="flex-1 text-red-500 border-red-500/30 hover:bg-red-500/10"
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
                  Ouverture de la discussion...
                </>
              ) : (
                <>
                  <MessageSquare className="size-4" />
                  Proposer un échange (48 h)
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-emerald-600" />
                  <span className="text-sm font-medium text-foreground">Conversation</span>
                </div>
                {!expired && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Timer className="size-3" />
                    {formatRemainingTime(remainingMs)} restantes
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[400px]">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-1">
                  <MessageSquare className="size-6 opacity-40" />
                  <p>Aucun message pour le moment.</p>
                  <p className="text-xs">Dites bonjour pour démarrer l&apos;échange.</p>
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
                          : 'bg-card border border-border rounded-bl-md'
                      }`}
                    >
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="Photo partagée"
                          className="rounded-xl max-w-[220px] max-h-[220px] object-cover mb-1"
                        />
                      )}
                      {msg.content && <p>{msg.content}</p>}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <p
                          className={`text-[10px] ${
                            isMine ? 'text-emerald-100' : 'text-muted-foreground'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                        {isMine &&
                          (msg.readAt ? (
                            <CheckCheck className="size-3.5 text-sky-300" aria-label="Lu" />
                          ) : (
                            <CheckCheck className="size-3.5 text-emerald-200/70" aria-label="Reçu" />
                          ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Photo preview */}
            {showPhotoPicker && (
              <div className="px-4 pb-2">
                <ProductImagePicker
                  images={chatPhoto}
                  onChange={setChatPhoto}
                  max={1}
                  minSize={640}
                  compact
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setShowPhotoPicker(false); setChatPhoto([]); }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={chatPhoto.length === 0 || sendingPhoto}
                    onClick={() => void sendPhoto()}
                  >
                    {sendingPhoto ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Envoyer la photo
                  </Button>
                </div>
              </div>
            )}

            {/* Message input */}
            <div className="px-4 py-3 border-t bg-background">
              {expired ? (
                <p className="text-xs text-center text-muted-foreground py-2">
                  Cette conversation a expiré (48 h). Les messages sont supprimés définitivement.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setShowPhotoPicker((v) => !v)}
                    aria-label="Envoyer une photo"
                  >
                    <ImagePlus className="size-5" />
                  </Button>
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
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Signaler un utilisateur</DialogTitle>
            <DialogDescription>
              Décrivez le problème. Notre équipe examinera le signalement.
            </DialogDescription>
          </DialogHeader>
          <textarea
            rows={4}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Ex : messages harcelants, arnaque, contenu inapproprié…"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-red-500 hover:bg-red-600 text-white"
              disabled={!reportReason.trim() || reporting}
              onClick={() => void reportUser()}
            >
              {reporting ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
              Envoyer le signalement
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setReportOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
