'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CreditCard,
  Clock,
  Check,
  XCircle,
  Ban,
  Play,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  Calendar,
  User,
  Inbox,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';

// ─── Types ────────────────────────────────────────────────────────────

interface RequestUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  photoId: string | null;
  isVerified: boolean;
  createdAt: string;
}

interface RequestCard {
  id: string;
  last4: string | null;
  qrCode: string;
  status: string;
  createdAt: string;
}

interface CardRequest {
  id: string;
  cardType: 'USD' | 'FC';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  createdAt: string;
  rejectReason: string | null;
  holderName: string | null;
  jobTitle: string | null;
  birthDate: string | null;
  photoData: string | null;
  user: RequestUser;
  card: RequestCard | null;
  admin: { id: string; name: string; username: string } | null;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

// ─── Helpers ──────────────────────────────────────────────────────────

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

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/40">
          <Clock className="h-3 w-3 mr-1" />
          En attente
        </Badge>
      );
    case 'approved':
      return (
        <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Approuvée
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="text-xs bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/40">
          <XCircle className="h-3 w-3 mr-1" />
          Rejetée
        </Badge>
      );
    case 'suspended':
      return (
        <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800/40">
          <Ban className="h-3 w-3 mr-1" />
          Suspendue
        </Badge>
      );
    default:
      return null;
  }
}

function getCardTypeBadge(cardType: string) {
  if (cardType === 'USD') {
    return (
      <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
        <DollarSign className="h-3 w-3 mr-1" />
        USD
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">
        CDF
    </Badge>
  );
}

// ─── Component ────────────────────────────────────────────────────────

export default function AdminCardRequestsScreen() {
  const { goBack, admin } = useAppStore();

  // Data
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Action loading states keyed by request ID
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<CardRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // ─── Fetch requests ───────────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cards/admin/requests?status=all');
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      } else {
        toast.error(data.message || 'Erreur lors du chargement');
      }
    } catch {
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ─── Filtered requests ────────────────────────────────────────────

  const filteredRequests = activeTab === 'all'
    ? requests
    : activeTab === 'pending'
      ? requests.filter((r) => r.status === 'pending')
      : activeTab === 'approved'
        ? requests.filter((r) => r.status === 'approved')
        : requests.filter((r) => r.status === 'rejected');

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  // ─── Action helpers ──────────────────────────────────────────────

  function setActionLoadingState(id: string, isLoading: boolean) {
    setActionLoading((prev) => ({ ...prev, [id]: isLoading }));
  }

  // ─── Approve ─────────────────────────────────────────────────────

  async function handleApprove(requestId: string) {
    if (!admin?.id) {
      toast.error('Session admin requise');
      return;
    }

    setActionLoadingState(requestId, true);
    try {
      const res = await fetch('/api/cards/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          requestId,
          action: 'approve',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Demande approuvée avec succès');
        fetchRequests();
      } else {
        toast.error(data.message || "Erreur lors de l'approbation");
      }
    } catch {
      toast.error("Erreur lors de l'approbation");
    } finally {
      setActionLoadingState(requestId, false);
    }
  }

  async function handleConfirmDelivery(request: CardRequest) {
    if (!admin?.id) return;
    setActionLoadingState(request.id, true);
    try {
      const res = await fetch('/api/cards/admin/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: admin.id, requestId: request.id, action: 'confirm-delivery' }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Remise confirmée, carte activée'); await fetchRequests(); }
      else toast.error(data.message || 'Erreur lors de la remise');
    } catch { toast.error('Erreur réseau'); }
    finally { setActionLoadingState(request.id, false); }
  }

  // ─── Reject ──────────────────────────────────────────────────────

  function openRejectDialog(request: CardRequest) {
    setRejectTarget(request);
    setRejectReason('');
    setRejectDialogOpen(true);
  }

  async function handleRejectSubmit() {
    if (!rejectTarget || !admin?.id) {
      toast.error('Données manquantes');
      return;
    }
    if (!rejectReason.trim()) {
      toast.error('Veuillez saisir une raison du refus');
      return;
    }

    setRejectLoading(true);
    try {
      const res = await fetch('/api/cards/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          requestId: rejectTarget.id,
          action: 'reject',
          reason: rejectReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Demande rejetée');
        setRejectDialogOpen(false);
        setRejectTarget(null);
        fetchRequests();
      } else {
        toast.error(data.message || 'Erreur lors du refus');
      }
    } catch {
      toast.error('Erreur lors du refus');
    } finally {
      setRejectLoading(false);
    }
  }

  // ─── Suspend card ────────────────────────────────────────────────

  async function handleSuspendCard(request: CardRequest) {
    if (!admin?.id || !request.card) {
      toast.error('Données manquantes');
      return;
    }

    setActionLoadingState(request.id, true);
    try {
      const res = await fetch('/api/cards/admin/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          cardId: request.card.id,
          action: 'suspend',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Carte suspendue avec succès');
        fetchRequests();
      } else {
        toast.error(data.message || 'Erreur lors de la suspension');
      }
    } catch {
      toast.error('Erreur lors de la suspension');
    } finally {
      setActionLoadingState(request.id, false);
    }
  }

  // ─── Activate card ───────────────────────────────────────────────

  async function handleActivateCard(request: CardRequest) {
    if (!admin?.id || !request.card) {
      toast.error('Données manquantes');
      return;
    }

    setActionLoadingState(request.id, true);
    try {
      const res = await fetch('/api/cards/admin/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          cardId: request.card.id,
          action: 'activate',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Carte réactivée avec succès');
        fetchRequests();
      } else {
        toast.error(data.message || 'Erreur lors de la réactivation');
      }
    } catch {
      toast.error('Erreur lors de la réactivation');
    } finally {
      setActionLoadingState(request.id, false);
    }
  }

  // ─── Render request card ─────────────────────────────────────────

  function renderRequestCard(request: CardRequest, index: number) {
    const isPending = request.status === 'pending';
    const isApproved = request.status === 'approved';
    const isSuspendedCard = request.card?.status === 'suspended';
    const isLoading = actionLoading[request.id] || false;

    return (
      <motion.div
        key={request.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.03, ease: 'easeOut' as const }}
      >
        <Card
          className={`hover:shadow-md transition-shadow ${
            isPending
              ? 'border-amber-200 dark:border-amber-800/40'
              : ''
          }`}
        >
          <CardContent className="p-4">
            {/* Top row: user info + status */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {request.user?.photoId ? (
                  <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 border-2 border-border">
                    <Image
                      src={request.user.photoId}
                      alt={request.user.name}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {request.user?.name || 'Client'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getCardTypeBadge(request.cardType)}
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              </div>
            </div>

            {/* User details */}
            <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{request.user?.phone}</span>
              </div>
              {request.user?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{request.user.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{formatDate(request.createdAt)}</span>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-[64px_1fr] gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="h-20 w-16 overflow-hidden rounded-md border bg-muted">
                {request.photoData ? <img src={request.photoData} alt={`Portrait de ${request.holderName || request.user?.name || 'titulaire'}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[9px] text-muted-foreground">Sans photo</div>}
              </div>
              <div className="space-y-1 text-xs">
                <p><span className="text-muted-foreground">Titulaire :</span> <strong>{request.holderName || request.user?.name}</strong></p>
                <p><span className="text-muted-foreground">Poste :</span> {request.jobTitle || '—'}</p>
                <p><span className="text-muted-foreground">Naissance :</span> {request.birthDate ? new Date(request.birthDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '—'}</p>
              </div>
            </div>

            {/* Card info (if approved) */}
            {request.card && (
              <div className="rounded-md bg-muted/50 border border-border px-3 py-2 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">{request.card.status === 'pending_retrieval' ? 'En attente de retrait' : request.card.last4 ? `Référence •••• ${request.card.last4}` : 'Carte TRAIT interne'}</span>
                  </div>
                  {request.card.status === 'active' ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700">
                      Active
                    </Badge>
                  ) : request.card.status === 'suspended' ? (
                    <Badge variant="outline" className="text-[10px] text-orange-700 border-orange-300 dark:text-orange-400 dark:border-orange-700">
                      Suspendue
                    </Badge>
                  ) : request.card.status === 'pending_retrieval' ? (
                    <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700">Retrait requis</Badge>
                  ) : null}
                </div>
              </div>
            )}

            {/* Reject reason */}
            {request.rejectReason && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 px-3 py-2 mb-3">
                <p className="text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  <strong>Raison :</strong> {request.rejectReason}
                </p>
              </div>
            )}

            <Separator className="my-3" />

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {isPending && (
                <>
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                    onClick={() => handleApprove(request.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5 mr-1" />
                    )}
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                    onClick={() => openRejectDialog(request)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                    )}
                    Rejeter
                  </Button>
                </>
              )}

              {isApproved && request.card && request.card.status === 'active' && (
                <Button
                  size="sm"
                  className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
                  onClick={() => handleSuspendCard(request)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Ban className="h-3.5 w-3.5 mr-1" />
                  )}
                  Suspendre
                </Button>
              )}

              {isApproved && request.card?.status === 'pending_retrieval' && (
                <Button size="sm" className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium" onClick={() => handleConfirmDelivery(request)} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                  Confirmer la remise
                </Button>
              )}

              {isApproved && request.card && isSuspendedCard && (
                <Button
                  size="sm"
                  className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                  onClick={() => handleActivateCard(request)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 mr-1" />
                  )}
                  Activer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ─── Render skeletons ────────────────────────────────────────────

  function renderSkeletons() {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-2.5 mb-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-4 w-40 mb-1.5" />
              <Skeleton className="h-4 w-52 mb-1.5" />
              <Skeleton className="h-4 w-28 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ─── Render empty state ──────────────────────────────────────────

  function renderEmptyState() {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' as const }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Inbox className="size-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg">Aucune demande</h3>
        <p className="text-muted-foreground text-sm mt-1">
          {activeTab === 'all'
            ? 'Aucune demande de carte pour le moment'
            : activeTab === 'pending'
              ? 'Aucune demande en attente'
              : activeTab === 'approved'
                ? 'Aucune demande approuvée'
                : 'Aucune demande rejetée'}
        </p>
      </motion.div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
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
              Demandes de Cartes
            </h1>
            <p className="text-xs text-muted-foreground">
              Gérer les demandes de cartes TRAIT
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setLoading(true);
              fetchRequests();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-4">
        {/* Filter tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs gap-1">
              Tous
              {counts.all > 0 && (
                <span className="ml-0.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                  {counts.all}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs gap-1">
              <Clock className="h-3.5 w-3.5" />
              En attente
              {counts.pending > 0 && (
                <span className="ml-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                  {counts.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Approuvées
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs gap-1">
              <XCircle className="h-3.5 w-3.5" />
              Rejetées
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {loading ? renderSkeletons() : filteredRequests.length === 0 ? renderEmptyState() : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredRequests.map((req, index) => renderRequestCard(req, index))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {loading ? renderSkeletons() : filteredRequests.length === 0 ? renderEmptyState() : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredRequests.map((req, index) => renderRequestCard(req, index))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            {loading ? renderSkeletons() : filteredRequests.length === 0 ? renderEmptyState() : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredRequests.map((req, index) => renderRequestCard(req, index))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {loading ? renderSkeletons() : filteredRequests.length === 0 ? renderEmptyState() : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredRequests.map((req, index) => renderRequestCard(req, index))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Reject Dialog ────────────────────────────────────────── */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Rejeter la demande
            </DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `Rejeter la demande de carte ${rejectTarget.cardType} de ${rejectTarget.user?.name || 'Client'}`
                : 'Rejeter cette demande de carte'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Raison du refus *</Label>
              <Textarea
                id="reject-reason"
                placeholder="Expliquez la raison du refus..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={rejectLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRejectSubmit}
              disabled={rejectLoading || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejectLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirmer le refus
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
