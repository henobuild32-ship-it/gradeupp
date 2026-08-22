'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  X,
  Loader2,
  Phone,
  Mail,
  Calendar,
  MapPin,
  User,
  Check,
  XCircle,
  Shield,
  Clock,
  Eye,
  Ban,
  AlertTriangle,
  BadgeCheck,
  RefreshCw,
  Send,
  Key,
  Copy,
  Image as ImageIcon,
} from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────

interface ValidationAgent {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  city: string | null;
  country: string;
  address: string | null;
  photoId: string | null;
  validationStatus: 'pending' | 'validated' | 'rejected' | 'suspended';
  validationRejectReason: string | null;
  agentCode: string | null;
  agentNumber: string | null;
  systemPassword: string | null;
  systemPasswordSent: boolean;
  suspended: boolean;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

type TabStatus = 'pending' | 'validated' | 'rejected';

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

function getGenderLabel(gender: string | null): string {
  if (!gender) return 'Non spécifié';
  switch (gender.toLowerCase()) {
    case 'male':
    case 'homme':
    case 'm':
      return 'Homme';
    case 'female':
    case 'femme':
    case 'f':
      return 'Femme';
    default:
      return gender;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'suspended':
      return (
        <Badge className="text-xs bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/40">
          <Ban className="h-3 w-3 mr-1" />
          Suspendu
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/40">
          <Clock className="h-3 w-3 mr-1" />
          En attente
        </Badge>
      );
    case 'validated':
      return (
        <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40">
          <BadgeCheck className="h-3 w-3 mr-1" />
          Validé
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="text-xs bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/40">
          <XCircle className="h-3 w-3 mr-1" />
          Refusé
        </Badge>
      );
    default:
      return null;
  }
}

function getCountryLabel(code: string): string {
  const map: Record<string, string> = {
    TG: 'Togo',
    CI: "Côte d'Ivoire",
    BJ: 'Bénin',
    GN: 'Guinée',
    CM: 'Cameroun',
    SN: 'Sénégal',
    ML: 'Mali',
    BF: 'Burkina Faso',
    NG: 'Nigeria',
    GH: 'Ghana',
    US: 'États-Unis',
    FR: 'France',
  };
  return map[code] || code;
}

// ─── Component ────────────────────────────────────────────────────────

export default function AdminAgentValidationScreen() {
  const { admin, goBack } = useAppStore();
  const adminHeaders: Record<string, string> = admin?.token ? { 'Authorization': `Bearer ${admin.token}` } : {};

  // Data
  const [pendingAgents, setPendingAgents] = useState<ValidationAgent[]>([]);
  const [validatedAgents, setValidatedAgents] = useState<ValidationAgent[]>([]);
  const [rejectedAgents, setRejectedAgents] = useState<ValidationAgent[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailAgent, setDetailAgent] = useState<ValidationAgent | null>(null);

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ValidationAgent | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Validate dialog
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [validateTarget, setValidateTarget] = useState<ValidationAgent | null>(null);
  const [validateLoading, setValidateLoading] = useState(false);
  const [generatedAgentNumber, setGeneratedAgentNumber] = useState<string | null>(null);
  const [generatedSystemPassword, setGeneratedSystemPassword] = useState<string | null>(null);
  const [sendEmailOnValidate, setSendEmailOnValidate] = useState(true);

  // Suspend dialog
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<ValidationAgent | null>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);

  // Reconsider dialog
  const [reconsiderDialogOpen, setReconsiderDialogOpen] = useState(false);
  const [reconsiderTarget, setReconsiderTarget] = useState<ValidationAgent | null>(null);
  const [reconsiderLoading, setReconsiderLoading] = useState(false);

  // ─── Debounce search ──────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Fetch agents ─────────────────────────────────────────────────

  const fetchAgents = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const statuses: TabStatus[] = ['pending', 'validated', 'rejected'];
      const results = await Promise.allSettled(
        statuses.map(async (status) => {
          const params = new URLSearchParams({ status });
          if (search.trim()) {
            params.set('search', search.trim());
          }
          const res = await fetch(`/api/admin/agent-validation?${params.toString()}`, { headers: adminHeaders });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erreur');
          return { status, agents: (data.agents ?? []) as ValidationAgent[] };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { status, agents } = result.value;
          switch (status) {
            case 'pending':
              setPendingAgents(agents);
              break;
            case 'validated':
              setValidatedAgents(agents);
              break;
            case 'rejected':
              setRejectedAgents(agents);
              break;
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch validation agents:', err);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents(debouncedSearch);
  }, [fetchAgents, debouncedSearch]);

  // ─── Filtered agents ─────────────────────────────────────────────

  const getFilteredAgents = (agents: ValidationAgent[]): ValidationAgent[] => {
    if (!debouncedSearch.trim()) return agents;
    const q = debouncedSearch.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        (a.email?.toLowerCase().includes(q) ?? false) ||
        (a.city?.toLowerCase().includes(q) ?? false)
    );
  };

  const currentAgents = getFilteredAgents(
    activeTab === 'pending'
      ? pendingAgents
      : activeTab === 'validated'
        ? validatedAgents
        : rejectedAgents
  );

  const totalCounts = {
    pending: pendingAgents.length,
    validated: validatedAgents.length,
    rejected: rejectedAgents.length,
  };

  // ─── Action handlers ────────────────────────────────────────────

  function openDetailDialog(agent: ValidationAgent) {
    setDetailAgent(agent);
    setDetailDialogOpen(true);
  }

  function openRejectDialog(agent: ValidationAgent) {
    setRejectTarget(agent);
    setRejectReason('');
    setRejectDialogOpen(true);
  }

  function openValidateDialog(agent: ValidationAgent) {
    setValidateTarget(agent);
    setGeneratedAgentNumber(null);
    setValidateDialogOpen(true);
  }

  function openSuspendDialog(agent: ValidationAgent) {
    setSuspendTarget(agent);
    setSuspendDialogOpen(true);
  }

  function openReconsiderDialog(agent: ValidationAgent) {
    setReconsiderTarget(agent);
    setReconsiderDialogOpen(true);
  }

  // ─── Validate ────────────────────────────────────────────────────

  async function handleValidateConfirm() {
    if (!validateTarget || !admin?.id) {
      toast.error('Données manquantes');
      return;
    }

    setValidateLoading(true);
    try {
      const res = await fetch('/api/admin/agent-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          adminId: admin.id,
          action: 'accept',
          agentId: validateTarget.id,
          sendEmail: sendEmailOnValidate,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedAgentNumber(data.agentNumber ?? data.agentCode ?? null);
        setGeneratedSystemPassword(data.systemPassword ?? null);
        toast.success(`${validateTarget.name} a été validé`);
        if (data.emailSent) {
          toast.info('Email avec identifiants envoyé à l\'agent');
        }
        // Refresh data after a short delay so user sees the dialog
        setTimeout(() => {
          fetchAgents(debouncedSearch);
        }, 800);
      } else {
        toast.error(data.error || 'Échec de la validation');
        setValidateDialogOpen(false);
      }
    } catch (err) {
      console.error('Validate error:', err);
      toast.error('Erreur lors de la validation');
      setValidateDialogOpen(false);
    } finally {
      setValidateLoading(false);
    }
  }

  // ─── Reject ──────────────────────────────────────────────────────

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
      const res = await fetch('/api/admin/agent-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          adminId: admin.id,
          action: 'reject',
          agentId: rejectTarget.id,
          reason: rejectReason.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${rejectTarget.name} a été refusé`);
        setRejectDialogOpen(false);
        setRejectTarget(null);
        fetchAgents(debouncedSearch);
      } else {
        toast.error(data.error || 'Échec du refus');
      }
    } catch (err) {
      console.error('Reject error:', err);
      toast.error('Erreur lors du refus');
    } finally {
      setRejectLoading(false);
    }
  }

  // ─── Suspend ─────────────────────────────────────────────────────

  async function handleSuspendConfirm() {
    if (!suspendTarget || !admin?.id) {
      toast.error('Données manquantes');
      return;
    }

    setSuspendLoading(true);
    try {
      const res = await fetch('/api/admin/agent-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          adminId: admin.id,
          action: 'suspend',
          agentId: suspendTarget.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${suspendTarget.name} a été suspendu`);
        setSuspendDialogOpen(false);
        setSuspendTarget(null);
        fetchAgents(debouncedSearch);
      } else {
        toast.error(data.error || 'Échec de la suspension');
      }
    } catch (err) {
      console.error('Suspend error:', err);
      toast.error('Erreur lors de la suspension');
    } finally {
      setSuspendLoading(false);
    }
  }

  // ─── Reconsider ──────────────────────────────────────────────────

  async function handleReconsiderConfirm() {
    if (!reconsiderTarget || !admin?.id) {
      toast.error('Données manquantes');
      return;
    }

    setReconsiderLoading(true);
    try {
      const res = await fetch('/api/admin/agent-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          adminId: admin.id,
          action: 'accept',
          agentId: reconsiderTarget.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${reconsiderTarget.name} a été reconsidéré et validé`);
        setReconsiderDialogOpen(false);
        setReconsiderTarget(null);
        fetchAgents(debouncedSearch);
      } else {
        toast.error(data.error || 'Échec de la reconsideration');
      }
    } catch (err) {
      console.error('Reconsider error:', err);
      toast.error('Erreur lors de la reconsideration');
    } finally {
      setReconsiderLoading(false);
    }
  }

  // ─── Resend Credentials ──────────────────────────────────────

  async function handleResendCredentials(agent: ValidationAgent) {
    if (!admin?.id || !agent.email) {
      toast.error('Email de l\'agent non disponible');
      return;
    }

    try {
      const res = await fetch('/api/admin/agent-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          adminId: admin.id,
          action: 'resend_credentials',
          agentId: agent.id,
        }),
      });

      const data = await res.json();
      if (data.success && data.emailSent) {
        toast.success('Email avec identifiants renvoyé avec succès');
      } else {
        toast.error('Erreur lors de l\'envoi de l\'email');
      }
    } catch {
      toast.error('Erreur lors du renvoi');
    }
  }

  // ─── Render agent card ───────────────────────────────────────────

  function renderAgentCard(agent: ValidationAgent, index: number) {
    const isPending = agent.validationStatus === 'pending';
    const isValidated = agent.validationStatus === 'validated';
    const isRejected = agent.validationStatus === 'rejected';

    return (
      <motion.div
        key={agent.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.03, ease: 'easeOut' as const }}
      >
        <Card
          className={`border-border hover:shadow-md transition-shadow cursor-pointer ${
            isPending
              ? 'border-amber-200 dark:border-amber-800/40'
              : isRejected
                ? 'border-red-200 dark:border-red-800/40'
                : ''
          } ${agent.suspended ? 'opacity-70' : ''}`}
        >
          <CardContent className="p-4">
            {/* Top row: name + status + actions */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div
                className="flex items-center gap-2 flex-wrap min-w-0 flex-1"
                onClick={() => openDetailDialog(agent)}
              >
                {agent.photoId ? (
                  <div className="h-8 w-8 rounded-full overflow-hidden shrink-0">
                    <Image
                      src={agent.photoId}
                      alt={agent.name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {agent.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getStatusBadge(agent.validationStatus)}
                    {agent.suspended && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        <Ban className="h-2.5 w-2.5 mr-0.5" />
                        Suspendu
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                  onClick={() => openDetailDialog(agent)}
                  title="Voir les détails"
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">Détails</span>
                </Button>

                {isPending && (
                  <>
                    <Button
                      size="sm"
                      className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                      onClick={() => openValidateDialog(agent)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden sm:inline">Valider</span>
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                      onClick={() => openRejectDialog(agent)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden sm:inline">Refuser</span>
                    </Button>
                  </>
                )}

                {isValidated && (
                  <Button
                    size="sm"
                    className="h-8 px-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
                    onClick={() => openSuspendDialog(agent)}
                    disabled={agent.suspended}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">
                      {agent.suspended ? 'Suspendu' : 'Suspendre'}
                    </span>
                  </Button>
                )}

                {isRejected && (
                  <Button
                    size="sm"
                    className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                    onClick={() => openReconsiderDialog(agent)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">Reconsidérer</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{agent.phone}</span>
              </div>
              {agent.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{agent.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                {(agent.city || agent.country) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {[agent.city, getCountryLabel(agent.country)].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              {isRejected && agent.validationRejectReason && (
                <div className="mt-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 px-2.5 py-1.5">
                  <p className="text-[11px] text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    <strong>Raison :</strong> {agent.validationRejectReason}
                  </p>
                </div>
              )}
              {isValidated && agent.agentNumber && (
                <div className="mt-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 px-2.5 py-1.5">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                    <Shield className="h-3 w-3 inline mr-1" />
                    N° Agent : {agent.agentNumber}
                    {agent.agentCode && ` (${agent.agentCode})`}
                  </p>
                </div>
              )}
            </div>

            <Separator className="my-3" />

            {/* Bottom row: date */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(agent.createdAt)}</span>
              </div>
              {isValidated && agent.agentNumber && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {agent.agentNumber}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ─── Render skeleton ─────────────────────────────────────────────

  function renderSkeletons() {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ─── Render empty state ──────────────────────────────────────────

  function renderEmptyState(status: TabStatus) {
    const messages: Record<TabStatus, { icon: typeof Clock; title: string; desc: string }> = {
      pending: {
        icon: Clock,
        title: 'Aucune demande en attente',
        desc: 'Toutes les demandes ont été traitées',
      },
      validated: {
        icon: BadgeCheck,
        title: 'Aucun agent validé',
        desc: 'Les agents validés apparaîtront ici',
      },
      rejected: {
        icon: XCircle,
        title: 'Aucune demande refusée',
        desc: 'Les demandes refusées apparaîtront ici',
      },
    };
    const msg = messages[status];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' as const }}
      >
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <msg.icon className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-base font-medium text-foreground mb-1">{msg.title}</p>
            <p className="text-sm text-muted-foreground text-center">{msg.desc}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────

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
          <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Retour</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              Validation Agents
            </h1>
            <p className="text-xs text-muted-foreground">
              Gérer les demandes de validation
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-muted-foreground">
              {totalCounts.pending} en attente
            </span>
          </div>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-4">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par nom, téléphone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-10 bg-muted/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabStatus)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pending" className="text-xs gap-1">
              <Clock className="h-3.5 w-3.5" />
              En attente
              {totalCounts.pending > 0 && (
                <span className="ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                  {totalCounts.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="validated" className="text-xs gap-1">
              <BadgeCheck className="h-3.5 w-3.5" />
              Validés
              {totalCounts.validated > 0 && (
                <span className="ml-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                  {totalCounts.validated}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs gap-1">
              <XCircle className="h-3.5 w-3.5" />
              Refusés
              {totalCounts.rejected > 0 && (
                <span className="ml-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                  {totalCounts.rejected}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {loading ? (
              renderSkeletons()
            ) : currentAgents.length === 0 ? (
              renderEmptyState('pending')
            ) : (
              <div className="space-y-3">
                {currentAgents.map((agent, index) => renderAgentCard(agent, index))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="validated" className="mt-4">
            {loading ? (
              renderSkeletons()
            ) : currentAgents.length === 0 ? (
              renderEmptyState('validated')
            ) : (
              <div className="space-y-3">
                {currentAgents.map((agent, index) => renderAgentCard(agent, index))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {loading ? (
              renderSkeletons()
            ) : currentAgents.length === 0 ? (
              renderEmptyState('rejected')
            ) : (
              <div className="space-y-3">
                {currentAgents.map((agent, index) => renderAgentCard(agent, index))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Detail Dialog ────────────────────────────────────────── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {detailAgent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Détails de l&apos;agent
                </DialogTitle>
                <DialogDescription>
                  Informations complètes de la demande
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Avatar + name + status */}
                <div className="flex items-center gap-3">
                  {detailAgent.photoId ? (
                    <div className="h-14 w-14 rounded-xl overflow-hidden border-2 border-border">
                      <Image
                        src={detailAgent.photoId}
                        alt={detailAgent.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-foreground truncate">
                      {detailAgent.name}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(detailAgent.validationStatus)}
                      {detailAgent.systemPasswordSent && (
                        <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/40">
                          <Send className="h-2.5 w-2.5 mr-0.5" />
                          Email envoyé
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Info grid */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Téléphone
                      </p>
                      <p className="font-medium text-foreground">{detailAgent.phone}</p>
                    </div>
                  </div>

                  {detailAgent.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                          Email
                        </p>
                        <p className="font-medium text-foreground truncate">
                          {detailAgent.email}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Genre
                      </p>
                      <p className="font-medium text-foreground">
                        {getGenderLabel(detailAgent.gender)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Localisation
                      </p>
                      <p className="font-medium text-foreground">
                        {[detailAgent.city, getCountryLabel(detailAgent.country)]
                          .filter(Boolean)
                          .join(', ') || 'Non spécifié'}
                      </p>
                    </div>
                  </div>

                  {detailAgent.address && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                          Adresse
                        </p>
                        <p className="font-medium text-foreground">{detailAgent.address}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Date d&apos;inscription
                      </p>
                      <p className="font-medium text-foreground">
                        {formatDate(detailAgent.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Agent number + system password (if validated) */}
                {detailAgent.validationStatus === 'validated' && detailAgent.agentNumber && (
                  <>
                    <Separator />
                    <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 p-3 space-y-2.5">
                      <div>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-medium flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5" />
                          Numéro d&apos;agent
                        </p>
                        <p className="text-lg font-mono font-bold text-emerald-800 dark:text-emerald-300">
                          {detailAgent.agentNumber}
                        </p>
                      </div>
                      {detailAgent.systemPassword && (
                        <div>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-medium flex items-center gap-1">
                            <Key className="h-3.5 w-3.5" />
                            Mot de passe système
                          </p>
                          <p className="text-base font-mono font-bold text-emerald-800 dark:text-emerald-300">
                            {detailAgent.systemPassword}
                          </p>
                        </div>
                      )}
                    </div>
                    {detailAgent.email && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800/40 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        onClick={() => handleResendCredentials(detailAgent)}
                      >
                        <Send className="h-3.5 w-3.5 mr-2" />
                        Renvoyer les identifiants par email
                      </Button>
                    )}
                  </>
                )}

                {/* Reject reason (if rejected) */}
                {detailAgent.validationStatus === 'rejected' && detailAgent.validationRejectReason && (
                  <>
                    <Separator />
                    <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-3">
                      <p className="text-xs text-red-700 dark:text-red-400 mb-1 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Raison du refus
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-300">
                        {detailAgent.validationRejectReason}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {detailAgent.validationStatus === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-initial border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-900/20"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        openRejectDialog(detailAgent);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Refuser
                    </Button>
                    <Button
                      className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        openValidateDialog(detailAgent);
                      }}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Valider
                    </Button>
                  </>
                )}
                {detailAgent.validationStatus === 'validated' && (
                  <Button
                    variant="outline"
                    className="border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800/40 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    onClick={() => {
                      setDetailDialogOpen(false);
                      openSuspendDialog(detailAgent);
                    }}
                    disabled={detailAgent.suspended}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    {detailAgent.suspended ? 'Déjà suspendu' : 'Suspendre'}
                  </Button>
                )}
                {detailAgent.validationStatus === 'rejected' && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    onClick={() => {
                      setDetailDialogOpen(false);
                      openReconsiderDialog(detailAgent);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconsidérer
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Reject Dialog ────────────────────────────────────────── */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              Refuser la demande
            </DialogTitle>
            <DialogDescription>
              Voulez-vous refuser la demande de{' '}
              <strong>{rejectTarget?.name}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Raison du refus <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                placeholder="Expliquez pourquoi cette demande est refusée..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="bg-muted/50 resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Cette raison sera visible par l&apos;agent concerné.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={rejectLoading}
            >
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
              onClick={handleRejectSubmit}
              disabled={rejectLoading || !rejectReason.trim()}
            >
              {rejectLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Traitement...
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

      {/* ─── Validate Dialog ──────────────────────────────────────── */}
      <Dialog open={validateDialogOpen} onOpenChange={(open) => {
        if (!open) setValidateDialogOpen(false);
      }}>
        <DialogContent className="sm:max-w-md">
          {!generatedAgentNumber ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="h-5 w-5" />
                  Valider l&apos;agent
                </DialogTitle>
                <DialogDescription>
                  Voulez-vous valider la demande de{' '}
                  <strong>{validateTarget?.name}</strong> ? Un numéro d&apos;agent et un mot de passe
                  système seront générés automatiquement.
                </DialogDescription>
              </DialogHeader>

              {validateTarget?.email && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendEmailOnValidate}
                    onChange={(e) => setSendEmailOnValidate(e.target.checked)}
                    className="rounded border-border accent-emerald-600"
                  />
                  <span className="text-sm text-muted-foreground">
                    Envoyer les identifiants à <strong>{validateTarget.email}</strong>
                  </span>
                </label>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setValidateDialogOpen(false)}
                  disabled={validateLoading}
                >
                  Annuler
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  onClick={handleValidateConfirm}
                  disabled={validateLoading}
                >
                  {validateLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Validation...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Valider
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="h-5 w-5" />
                  Agent validé avec succès
                </DialogTitle>
                <DialogDescription>
                  <strong>{validateTarget?.name}</strong> a été validé. Voici ses informations
                  d&apos;agent.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 p-4 text-center space-y-3">
                <Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    Code Agent
                  </p>
                  <p className="text-2xl font-mono font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                    {generatedAgentNumber}
                  </p>
                </div>
                {generatedSystemPassword && (
                  <div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center justify-center gap-1">
                      <Key className="h-3.5 w-3.5" />
                      Mot de passe système
                    </p>
                    <p className="text-lg font-mono font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                      {generatedSystemPassword}
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">
                  Ces identifiants sont également envoyés à l&apos;agent par email
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  onClick={() => setValidateDialogOpen(false)}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Suspend Dialog ───────────────────────────────────────── */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Ban className="h-5 w-5" />
              Suspendre l&apos;agent
            </DialogTitle>
            <DialogDescription>
              Voulez-vous suspendre <strong>{suspendTarget?.name}</strong> ? L&apos;agent ne
              pourra plus accéder à ses services tant qu&apos;il n&apos;est pas réactivé.
            </DialogDescription>
          </DialogHeader>

          {suspendTarget?.agentNumber && (
            <div className="rounded-md bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Numéro d&apos;agent</p>
              <p className="text-lg font-mono font-bold">{suspendTarget.agentNumber}</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSuspendDialogOpen(false)}
              disabled={suspendLoading}
            >
              Annuler
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={handleSuspendConfirm}
              disabled={suspendLoading}
            >
              {suspendLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Traitement...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Suspendre
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reconsider Dialog ────────────────────────────────────── */}
      <Dialog open={reconsiderDialogOpen} onOpenChange={setReconsiderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <RefreshCw className="h-5 w-5" />
              Reconsidérer la demande
            </DialogTitle>
            <DialogDescription>
              Voulez-vous reconsidérer et valider la demande de{' '}
              <strong>{reconsiderTarget?.name}</strong> ? L&apos;agent recevra un numéro
              d&apos;agent et pourra accéder aux services.
            </DialogDescription>
          </DialogHeader>

          {reconsiderTarget?.validationRejectReason && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">Ancienne raison du refus :</p>
              <p className="text-sm text-foreground italic">
                &ldquo;{reconsiderTarget.validationRejectReason}&rdquo;
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReconsiderDialogOpen(false)}
              disabled={reconsiderLoading}
            >
              Annuler
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={handleReconsiderConfirm}
              disabled={reconsiderLoading}
            >
              {reconsiderLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Traitement...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Valider la demande
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
