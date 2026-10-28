'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CreditCard,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  Calendar,
  User,
  Search,
  Plus,
  Printer,
  Send,
  Shield,
  ShieldOff,
  Ban,
  Play,
  Eye,
  X,
  Check,
  Filter,
  QrCode,
  Wallet,
  Clock,
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import TraitCard from '@/components/trait/TraitCard';

// ─── Types ────────────────────────────────────────────────────────────

interface CardUser {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  photoId: string | null;
  isVerified: boolean;
  realBalance: number;
  realBalanceFC: number;
  suspended: boolean;
  createdAt: string;
}

interface TraitCardData {
  id: string;
  cardType: string;
  cardNumber: string;
  last4: string | null;
  qrCode: string;
  expiryDate: string | null;
  holderName: string | null;
  jobTitle: string | null;
  birthDate: string | null;
  holderPhoto: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: CardUser;
  request: { id: string; status: string; createdAt: string };
  _count: { payments: number };
}

interface CardStats {
  total: number;
  active: number;
  suspended: number;
  blocked: number;
  usd: number;
  fc: number;
  pendingRetrieval?: number;
}

type FilterTab = 'all' | 'active' | 'suspended' | 'blocked' | 'pending_retrieval';

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40">
          <Check className="h-2.5 w-2.5 mr-0.5" />
          Active
        </Badge>
      );
    case 'suspended':
      return (
        <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/40">
          <ShieldOff className="h-2.5 w-2.5 mr-0.5" />
          Suspendue
        </Badge>
      );
    case 'blocked':
      return (
        <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/40">
          <Ban className="h-2.5 w-2.5 mr-0.5" />
          Bloquée
        </Badge>
      );
    case 'pending_retrieval':
      return <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400">Retrait requis</Badge>;
    default:
      return null;
  }
}

function getCardTypeBadge(cardType: string) {
  if (cardType === 'USD') {
    return (
      <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 font-semibold">
        USD
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] border-red-300 text-red-700 dark:border-red-700 dark:text-red-400 font-semibold">
        CDF
    </Badge>
  );
}

// ─── Component ────────────────────────────────────────────────────────

export default function AdminCardsScreen() {
  const { goBack, navigateTo, admin } = useAppStore();

  // ─── State ───────────────────────────────────────────────────────
  const [cards, setCards] = useState<TraitCardData[]>([]);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Card detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TraitCardData | null>(null);

  // ─── Fetch cards ─────────────────────────────────────────────────

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', activeTab);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/cards/admin/cards?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCards(data.cards || []);
        setStats(data.stats || null);
      } else {
        toast.error(data.message || 'Erreur lors du chargement');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // ─── Filtered cards ─────────────────────────────────────────────

  const filteredCards = activeTab === 'all'
    ? cards
    : cards.filter((c) => c.status === activeTab);

  // ─── Action helpers ─────────────────────────────────────────────

  function setActionLoadingState(id: string, isLoading: boolean) {
    setActionLoading((prev) => ({ ...prev, [id]: isLoading }));
  }

  // ─── Suspend / Activate / Block card ────────────────────────────

  async function handleCardAction(cardId: string, action: 'suspend' | 'activate', apiRoute: string) {
    if (!admin?.id) return;

    setActionLoadingState(cardId, true);
    try {
      const res = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: admin.id, cardId, action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          action === 'suspend' ? 'Carte suspendue' : 'Carte réactivée'
        );
        fetchCards();
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setActionLoadingState(cardId, false);
    }
  }

  async function handleBlockCard(cardId: string) {
    if (!admin?.id) return;

    setActionLoadingState(cardId, true);
    try {
      const res = await fetch('/api/cards/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          cardId,
          action: 'block',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Carte bloquée');
        fetchCards();
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setActionLoadingState(cardId, false);
    }
  }

  async function handleConfirmDelivery(card: TraitCardData) {
    if (!admin?.id) return;
    setActionLoadingState(card.id, true);
    try {
      const res = await fetch('/api/cards/admin/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: admin.id, requestId: card.request.id, action: 'confirm-delivery' }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Remise confirmée, carte activée'); await fetchCards(); }
      else toast.error(data.message || 'Erreur lors de la remise');
    } catch { toast.error('Erreur réseau'); }
    finally { setActionLoadingState(card.id, false); }
  }

  // ─── Send card info ─────────────────────────────────────────────

  async function handleSendCardInfo(cardId: string) {
    if (!admin?.id) return;

    setActionLoadingState(cardId, true);
    try {
      const res = await fetch('/api/cards/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          cardId,
          action: 'send-info',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Informations envoyées au client');
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setActionLoadingState(cardId, false);
    }
  }

  // ─── Print card ─────────────────────────────────────────────────

  function handlePrintCard(card: TraitCardData) {
    const popup = window.open('', '_blank');
    if (!popup) { toast.error('Autorisez la fenêtre d’impression pour continuer'); return; }
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
    const holder = escapeHtml(card.holderName || card.user?.name || 'TITULAIRE');
    const job = escapeHtml(card.jobTitle || 'Membre TRAIT');
    const birth = card.birthDate ? new Date(card.birthDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) + '/XXXX' : '••/••/XXXX';
    const photo = card.holderPhoto ? `<img class="portrait" src="${card.holderPhoto}" alt="Portrait" />` : '<div class="portrait placeholder">Portrait</div>';
    const qr = document.getElementById(`trait-card-qr-${card.id}`)?.querySelector('svg')?.outerHTML || '<div class="qr-empty">QR indisponible</div>';
    const ref = card.last4 || card.id.slice(-4).toUpperCase();
    popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Carte TRAIT — ${holder}</title><style>
      *{box-sizing:border-box}body{margin:0;padding:32px;background:#eef2f7;font-family:Arial,sans-serif;color:#fff}.sheet{max-width:760px;margin:auto;display:grid;gap:22px}.side{position:relative;overflow:hidden;aspect-ratio:1.586/1;border:1px solid #ffffff30;border-radius:22px;padding:28px;background:linear-gradient(135deg,#102b35,#102c45 55%,#111827);box-shadow:0 20px 45px #0f172a30}.side:after{content:"";position:absolute;width:270px;height:270px;border-radius:50%;right:-90px;top:-120px;background:#5eead4;opacity:.13;filter:blur(12px)}.top,.brand{display:flex;align-items:center;gap:12px}.top{position:relative;z-index:1;justify-content:space-between}.brand strong{letter-spacing:5px;font-size:23px}.brand small{display:block;font-size:8px;letter-spacing:2px;color:#ffffff88;margin-top:3px}.type{border:1px solid #ffffff44;border-radius:18px;padding:7px 14px;font-size:11px;font-weight:bold}.front-body{position:absolute;z-index:1;left:28px;right:28px;bottom:28px;display:grid;grid-template-columns:125px 1fr;gap:22px;align-items:end}.portrait{width:125px;height:154px;object-fit:cover;border-radius:14px;border:1px solid #ffffff77;background:#ffffff16}.placeholder{display:grid;place-items:center;color:#ffffff77;font-size:11px}.label{font-size:8px;letter-spacing:2px;color:#ffffff88;margin-bottom:4px}.name{font-size:21px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-bottom:13px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.value{font-size:12px;font-weight:bold}.meta{position:absolute;bottom:12px;right:25px;font-size:8px;letter-spacing:1px;color:#ffffff88}.back{background:linear-gradient(145deg,#111827,#172637 60%,#0a111b)}.stripe{position:absolute;top:28%;left:0;right:0;height:18%;background:#05080e}.back-body{position:absolute;z-index:1;inset:26px;display:flex;justify-content:space-between;align-items:flex-end}.backcopy{max-width:66%}.backcopy p{font-size:9px;line-height:1.6;color:#ffffff9c}.owned{font-size:16px;font-weight:bold;text-transform:uppercase}.qr{width:105px;height:105px;background:#fff;padding:7px;border-radius:12px;display:grid;place-items:center}.qr svg{width:100%;height:100%}.qr-empty{color:#475569;font-size:8px;text-align:center}.footer{font-size:8px;color:#ffffff70;letter-spacing:1px;margin-top:10px}@media print{body{padding:0;background:#fff}.sheet{gap:12mm}.side{box-shadow:none;break-inside:avoid}}
      </style></head><body><main class="sheet"><section class="side"><div class="top"><div class="brand"><strong>TRAIT</strong><small>IDENTITÉ & PORTEFEUILLE</small></div><span class="type">${escapeHtml(card.cardType)}</span></div><div class="front-body">${photo}<div><div class="label">NOM DU TITULAIRE</div><div class="name">${holder}</div><div class="grid"><div><div class="label">POSTE / RÔLE</div><div class="value">${job}</div></div><div><div class="label">NAISSANCE</div><div class="value">${birth}</div></div><div><div class="label">IDENTIFIANT</div><div class="value">•••• ${escapeHtml(ref)}</div></div><div><div class="label">STATUT</div><div class="value">${escapeHtml(card.status.toUpperCase())}</div></div></div></div></div><div class="meta">SANS CVV NI NUMÉRO BANCAIRE</div></section><section class="side back"><div class="stripe"></div><div class="top"><div class="brand"><strong>TRAIT</strong><small>CARTE D’IDENTITÉ & PORTEFEUILLE</small></div><span class="type">${escapeHtml(card.cardType)}</span></div><div class="back-body"><div class="backcopy"><div class="label">CARTE PERSONNELLE — PROPRIÉTÉ DE</div><div class="owned">${holder}</div><p>Cette carte reste la propriété de TRAIT et de son titulaire. En cas de perte, contactez l’administration. Le QR identifie uniquement le portefeuille et ne contient aucun secret de paiement.</p><div class="footer">TRAIT · Portefeuille interne</div></div><div class="qr">${qr}</div></div></section></main><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }
  // ─── Open card detail ───────────────────────────────────────────

  function openCardDetail(card: TraitCardData) {
    setSelectedCard(card);
    setDetailDialogOpen(true);
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* ─── Header ──────────────────────────────────────────────── */}
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
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              Cartes
            </h1>
            <p className="text-xs text-muted-foreground">
              Gestion des cartes numériques TRAIT
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setLoading(true); fetchCards(); }}
              disabled={loading}
              className="rounded-full"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full px-4 gap-1.5"
              onClick={() => navigateTo('admin-card-requests')}
            >
              <Plus className="h-3.5 w-3.5" />
              Demandes
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-4">
        {/* ─── Stats Grid ─────────────────────────────────────────── */}
        {stats && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-3 gap-2.5"
          >
            {[
              { label: 'Total', value: stats.total, color: 'text-foreground', bg: 'bg-muted', icon: CreditCard },
              { label: 'Actives', value: stats.active, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40', icon: Check },
              { label: 'Suspendues', value: stats.suspended, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40', icon: ShieldOff },
              { label: 'Bloquées', value: stats.blocked, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40', icon: Ban },
              { label: 'USD', value: stats.usd, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: Wallet },
              { label: 'CDF', value: stats.fc, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', icon: Wallet },
              { label: 'Retrait requis', value: stats.pendingRetrieval || 0, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', icon: Clock },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                >
                  <Card className="border-border">
                    <CardContent className="p-3 text-center">
                      <div className={`w-7 h-7 rounded-md ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}>
                        <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                      </div>
                      <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {loading && stats === null && (
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <Skeleton className="h-7 w-7 rounded-md mx-auto mb-1.5" />
                  <Skeleton className="h-6 w-10 mx-auto mb-1" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ─── Search ─────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titulaire, téléphone ou référence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl text-sm bg-muted/50 border-border"
          />
        </div>

        {/* ─── Filter Tabs ────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="all" className="text-xs gap-1">
              Tous
              {stats && stats.total > 0 && (
                <span className="ml-0.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                  {stats.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs gap-1">
              <Check className="h-3 w-3" />
              Actives
            </TabsTrigger>
            <TabsTrigger value="suspended" className="text-xs gap-1">
              <ShieldOff className="h-3 w-3" />
              Suspendues
            </TabsTrigger>
            <TabsTrigger value="blocked" className="text-xs gap-1">
              <Ban className="h-3 w-3" />
              Bloquées
            </TabsTrigger>
            <TabsTrigger value="pending_retrieval" className="text-[10px] gap-1 px-1">
              Retrait
              {stats?.pendingRetrieval ? <span className="ml-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">{stats.pendingRetrieval}</span> : null}
            </TabsTrigger>
          </TabsList>

          {/* ─── Cards List ───────────────────────────────────────── */}
          {['all', 'active', 'suspended', 'blocked', 'pending_retrieval'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-3">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <div className="flex gap-1.5">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredCards.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg">Aucune carte</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {tab === 'all'
                      ? 'Aucune carte générée pour le moment'
                      : `Aucune carte ${tab === 'active' ? 'active' : tab === 'suspended' ? 'suspendue' : 'bloquée'}`}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {filteredCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.25, delay: index * 0.03 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            {/* Top: User info + badges */}
                            <div className="flex items-start gap-3 mb-3">
                              {card.user?.photoId ? (
                                <div className="h-11 w-11 rounded-full overflow-hidden shrink-0 border-2 border-border">
                                  <Image
                                    src={card.user.photoId}
                                    alt={card.user.name || 'Client'}
                                    width={44}
                                    height={44}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold text-foreground truncate">
                                    {card.user?.name || 'Client'}
                                  </h3>
                                  {getCardTypeBadge(card.cardType)}
                                  {getStatusBadge(card.status)}
                                </div>
                                <p className="text-xs font-mono text-muted-foreground mt-0.5 tracking-wider">
                                  {card.cardNumber}
                                </p>
                              </div>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-3">
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span className="truncate">{card.user?.phone}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 shrink-0" />
                                <span>{card.status === 'pending_retrieval' ? 'À retirer après validation' : 'Portefeuille TRAIT'}</span>
                              </div>
                              {card.user?.email && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{card.user.email}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{formatDate(card.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Wallet className="h-3 w-3 shrink-0" />
                                <span className="font-semibold">
                                  {card.cardType === 'USD'
                                    ? `$${(card.user?.realBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                    : `${(card.user?.realBalanceFC ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} CDF`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <QrCode className="h-3 w-3 shrink-0" />
                                <span className="truncate">{card._count.payments} paiement(s)</span>
                              </div>
                            </div>

                            <Separator className="my-2.5" />

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-[11px] gap-1"
                                onClick={() => openCardDetail(card)}
                              >
                                <Eye className="h-3 w-3" />
                                Voir
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-[11px] gap-1"
                                onClick={() => handlePrintCard(card)}
                              >
                                <Printer className="h-3 w-3" />
                                Imprimer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-[11px] gap-1"
                                onClick={() => handleSendCardInfo(card.id)}
                                disabled={actionLoading[card.id]}
                              >
                                {actionLoading[card.id] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3" />
                                )}
                                Envoyer
                              </Button>

                              {card.status === 'active' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2.5 text-[11px] gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
                                    onClick={() => handleCardAction(card.id, 'suspend', '/api/cards/admin/manage')}
                                    disabled={actionLoading[card.id]}
                                  >
                                    {actionLoading[card.id] ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <ShieldOff className="h-3 w-3" />
                                    )}
                                    Suspendre
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2.5 text-[11px] gap-1 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                                    onClick={() => handleBlockCard(card.id)}
                                    disabled={actionLoading[card.id]}
                                  >
                                    {actionLoading[card.id] ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Ban className="h-3 w-3" />
                                    )}
                                    Bloquer
                                  </Button>
                                </>
                              )}
                              {card.status === 'pending_retrieval' && card.request.status === 'approved' && (
                                <Button size="sm" className="h-8 px-2.5 text-[11px] gap-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleConfirmDelivery(card)} disabled={actionLoading[card.id]}>
                                  {actionLoading[card.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                  Confirmer la remise
                                </Button>
                              )}

                              {(card.status === 'suspended' || card.status === 'blocked') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-[11px] gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/20"
                                  onClick={() => handleCardAction(card.id, 'activate', '/api/cards/admin/manage')}
                                  disabled={actionLoading[card.id]}
                                >
                                  {actionLoading[card.id] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                  Réactiver
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ─── Card Detail Dialog ──────────────────────────────────── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  Détails de la carte
                </DialogTitle>
                <DialogDescription>
                  {selectedCard.cardNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Card preview */}
                <TraitCard
                  cardType={selectedCard.cardType as 'USD' | 'FC'}
                  cardNumber={selectedCard.cardNumber}
                  cardHolder={selectedCard.holderName || selectedCard.user?.name || 'TITULAIRE'}
                  expiryDate={selectedCard.expiryDate}
                  qrCode={selectedCard.qrCode}
                  jobTitle={selectedCard.jobTitle}
                  birthDate={selectedCard.birthDate ? new Date(selectedCard.birthDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) + '/XXXX' : null}
                  holderPhoto={selectedCard.holderPhoto}
                  cardId={selectedCard.id}
                  requestStatus={selectedCard.request.status}
                  balance={selectedCard.cardType === 'USD'
                    ? (selectedCard.user?.realBalance ?? 0)
                    : (selectedCard.user?.realBalanceFC ?? 0)
                  }
                  status={selectedCard.status}
                />

                {/* Owner info */}
                <Card className="border-border">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Propriétaire
                    </p>
                    <div className="flex items-center gap-3">
                      {selectedCard.user?.photoId ? (
                        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-border">
                          <Image
                            src={selectedCard.user.photoId}
                            alt={selectedCard.user.name || ''}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{selectedCard.user?.name || 'Sans nom'}</p>
                        <p className="text-xs text-muted-foreground">{selectedCard.user?.phone}</p>
                        {selectedCard.user?.email && (
                          <p className="text-xs text-muted-foreground truncate">{selectedCard.user.email}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {selectedCard.user?.isVerified && (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">
                            <BadgeCheck className="h-3 w-3 mr-0.5" />
                            Vérifié
                          </Badge>
                        )}
                        {getStatusBadge(selectedCard.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card details */}
                <Card className="border-border">
                  <CardContent className="p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      Informations de la carte
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Référence de portefeuille</p>
                        <p className="font-mono font-semibold">{selectedCard.cardNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-semibold">{selectedCard.cardType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Poste / rôle</p>
                        <p className="font-semibold">{selectedCard.jobTitle || '—'}</p>
                      </div>
                      <div><p className="text-muted-foreground">Naissance (administration)</p><p className="font-semibold">{selectedCard.birthDate ? new Date(selectedCard.birthDate).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—'}</p></div>
                      <div>
                        <p className="text-muted-foreground">ID Carte</p>
                        <p className="font-mono text-[10px] truncate">{selectedCard.id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">QR Code</p>
                        <p className="font-mono text-[10px] truncate">{selectedCard.qrCode}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Solde {selectedCard.cardType}</p>
                        <p className="font-semibold">
                          {selectedCard.cardType === 'USD'
                            ? `$${(selectedCard.user?.realBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : `${(selectedCard.user?.realBalanceFC ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} CDF`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Paiements</p>
                        <p className="font-semibold">{selectedCard._count.payments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card className="border-border">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Historique
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Créée le {formatDate(selectedCard.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>Dernière modification le {formatDate(selectedCard.updatedAt)}</span>
                      </div>
                      {selectedCard.request && (
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          <span>Demande: {formatDate(selectedCard.request.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePrintCard(selectedCard)}
                  className="gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSendCardInfo(selectedCard.id)}
                  disabled={actionLoading[selectedCard.id]}
                  className="gap-1.5"
                >
                  {actionLoading[selectedCard.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Envoyer au client
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
