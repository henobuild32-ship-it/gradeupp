'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  X,
  Plus,
  Loader2,
  Phone,
  Calendar,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  MapPin,
  UserCog,
  Ban,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  UserCheck,
  Mail,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  agentCode: string | null;
  country: string;
  location: string | null;
  suspended: boolean;
  validationStatus: string;
  realBalance: number;
  bonusBalance: number;
  createdAt: string;
  _count?: {
    deposits?: number;
    withdrawals?: number;
  };
}

const countries = [
  { value: 'TG', label: 'Togo' },
  { value: 'CI', label: "Côte d'Ivoire" },
  { value: 'BJ', label: 'Bénin' },
  { value: 'GN', label: 'Guinée' },
  { value: 'CM', label: 'Cameroun' },
  { value: 'SN', label: 'Sénégal' },
  { value: 'ML', label: 'Mali' },
  { value: 'BF', label: 'Burkina Faso' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'US', label: 'États-Unis' },
  { value: 'FR', label: 'France' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatBalance(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default function AdminAgentsScreen() {
  const { admin, goBack } = useAppStore();

  const adminHeaders = {
    'Content-Type': 'application/json',
    ...(admin?.token ? { Authorization: `Bearer ${admin.token}` } : {}),
  };

  // Data
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Approve dialog
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Agent | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [sendEmailOnApprove, setSendEmailOnApprove] = useState(true);
  const [approvedCode, setApprovedCode] = useState<string | null>(null);
  const [approveResultOpen, setApproveResultOpen] = useState(false);
  const [approveEmailSent, setApproveEmailSent] = useState(false);

  // Create agent dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    password: '',
    country: '',
    location: '',
  });

  // Suspend dialog
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Agent | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Fetch Agents ──────────────────────────────────────────────

  const fetchAgents = useCallback(async (p: number, append: boolean) => {
    if (!append) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '10');
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/agents?${params.toString()}`, {
        headers: adminHeaders,
      });
      const data = await res.json();

      if (data.success) {
        const fetched: Agent[] = data.agents ?? [];
        if (append) {
          setAgents((prev) => [...prev, ...fetched]);
        } else {
          setAgents(fetched);
        }
        setHasMore(fetched.length >= 10);
        setPage(p);
      } else {
        toast.error(data.message || 'Erreur lors du chargement');
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, admin?.token]);

  useEffect(() => {
    setPage(1);
    fetchAgents(1, false);
  }, [fetchAgents]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchAgents(1, false);
  }

  function handleLoadMore() {
    fetchAgents(page + 1, true);
  }

  // ─── Approve pending agent ─────────────────────────────────────

  function openApproveDialog(agent: Agent) {
    setApproveTarget(agent);
    setSendEmailOnApprove(true);
    setApproveDialogOpen(true);
  }

  async function handleApproveConfirm() {
    if (!approveTarget || !admin?.id) {
      toast.error('Données manquantes');
      return;
    }

    setApproveLoading(true);
    try {
      const res = await fetch('/api/admin/agent-validation', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          adminId: admin.id,
          action: 'accept',
          agentId: approveTarget.id,
          sendEmail: sendEmailOnApprove,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setApprovedCode(data.agentCode ?? null);
        setApproveEmailSent(!!data.emailSent);
        setApproveDialogOpen(false);
        setApproveResultOpen(true);
        toast.success(`${approveTarget.name} validé — code ${data.agentCode}`);
        if (data.emailSent) {
          toast.info('Email prédéfini envoyé à l\'agent');
        }
        fetchAgents(1, false);
      } else {
        toast.error(data.message || 'Échec de la validation');
      }
    } catch (err) {
      console.error('Approve error:', err);
      toast.error('Erreur lors de la validation');
    } finally {
      setApproveLoading(false);
    }
  }

  // ─── Create Agent ──────────────────────────────────────────────

  function openCreateDialog() {
    setCreateForm({ name: '', phone: '', password: '', country: '', location: '' });
    setShowPassword(false);
    setCreateDialogOpen(true);
  }

  async function handleCreateAgent() {
    if (!admin?.id) {
      toast.error('Session admin invalide');
      return;
    }
    if (!createForm.name.trim() || !createForm.phone.trim() || !createForm.password.trim() || !createForm.country) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          adminId: admin.id,
          action: 'create',
          name: createForm.name.trim(),
          phone: createForm.phone.trim(),
          password: createForm.password,
          country: createForm.country,
          location: createForm.location.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Agent créé avec succès ! Code: ${data.agentCode || data.agent?.agentCode}`);
        setCreateDialogOpen(false);
        fetchAgents(1, false);
      } else {
        toast.error(data.message || 'Échec de la création');
      }
    } catch (err) {
      console.error('Create agent error:', err);
      toast.error('Erreur lors de la création');
    } finally {
      setCreateLoading(false);
    }
  }

  // ─── Suspend / Reactivate ──────────────────────────────────────

  function openSuspendDialog(agent: Agent) {
    setSuspendTarget(agent);
    setSuspendReason('');
    setSuspendDialogOpen(true);
  }

  async function handleSuspendSubmit() {
    if (!suspendTarget || !admin?.id) {
      toast.error('Données manquantes');
      return;
    }
    if (!suspendTarget.suspended && !suspendReason.trim()) {
      toast.error('Veuillez saisir une raison');
      return;
    }

    setSuspendLoading(true);
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          agentId: suspendTarget.id,
          adminId: admin.id,
          action: suspendTarget.suspended ? 'reactivate' : 'suspend',
          reason: suspendReason.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          suspendTarget.suspended
            ? `${suspendTarget.name} a été réactivé`
            : `${suspendTarget.name} a été suspendu`
        );
        setSuspendDialogOpen(false);
        setSuspendTarget(null);
        fetchAgents(1, false);
      } else {
        toast.error(data.message || 'Action échouée');
      }
    } catch (err) {
      console.error('Suspend error:', err);
      toast.error("Erreur lors de l'action");
    } finally {
      setSuspendLoading(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────

  function openDeleteDialog(agent: Agent) {
    setDeleteTarget(agent);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !admin?.id) {
      toast.error('Données manquantes');
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          agentId: deleteTarget.id,
          adminId: admin.id,
          action: 'delete',
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${deleteTarget.name} a été désactivé`);
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        fetchAgents(1, false);
      } else {
        toast.error(data.message || 'Échec de la désactivation');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────

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
              Gestion Agents
            </h1>
            <p className="text-xs text-muted-foreground">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} trouvé{agents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Créer un Agent</span>
            <span className="sm:hidden">Créer</span>
          </Button>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-4">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
        >
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher par nom, téléphone, code agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-10 bg-muted/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); fetchAgents(1, false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </motion.div>

        <Separator />

        {/* Agents List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' as const }}
          >
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserCog className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-base font-medium text-foreground mb-1">
                  Aucun agent trouvé
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Modifiez vos critères de recherche ou créez un nouvel agent
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <div className="space-y-3">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03, ease: 'easeOut' as const }}
                >
                  <Card className={`border-border hover:shadow-md transition-shadow ${
                    agent.suspended ? 'border-red-200 dark:border-red-800/40' : ''
                  }`}>
                    <CardContent className="p-4">
                      {/* Top row: name + code + status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {agent.name}
                          </h3>
                          {agent.validationStatus === 'pending' ? (
                            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/40">
                              En attente
                            </Badge>
                          ) : agent.validationStatus === 'rejected' ? (
                            <Badge variant="destructive" className="text-xs">
                              Refusé
                            </Badge>
                          ) : agent.agentCode ? (
                            <Badge className="font-mono text-xs bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40">
                              {agent.agentCode}
                            </Badge>
                          ) : null}
                          {agent.suspended && (
                            <Badge variant="destructive" className="text-xs">
                              Suspendu
                            </Badge>
                          )}
                          {!agent.suspended && agent.validationStatus === 'validated' && (
                            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40">
                              Actif
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {agent.validationStatus === 'pending' && (
                            <Button
                              size="icon"
                              className="h-8 w-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => openApproveDialog(agent)}
                              title="Valider l'agent"
                            >
                              <UserCheck className="h-4 w-4" />
                              <span className="sr-only">Valider</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-md ${
                              agent.suspended
                                ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            }`}
                            onClick={() => openSuspendDialog(agent)}
                            title={agent.suspended ? 'Réactiver' : 'Suspendre'}
                          >
                            {agent.suspended ? (
                              <RotateCcw className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                            <span className="sr-only">{agent.suspended ? 'Réactiver' : 'Suspendre'}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => openDeleteDialog(agent)}
                            title="Désactiver"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Désactiver</span>
                          </Button>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{agent.phone}</span>
                        </div>
                        {agent.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{agent.location}</span>
                          </div>
                        )}
                      </div>

                      <Separator className="my-3" />

                      {/* Bottom row: balance, ops, date */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-medium text-foreground">
                            {formatBalance(agent.realBalance + agent.bonusBalance)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{agent._count?.deposits ?? 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ArrowUpFromLine className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                            <span>{agent._count?.withdrawals ?? 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(agent.createdAt)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800/40 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Chargement...
                    </>
                  ) : (
                    'Charger plus'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Create Agent Dialog ──────────────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-emerald-600" />
              Créer un Agent
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations pour créer un nouveau compte agent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Nom <span className="text-red-500">*</span></Label>
              <Input
                id="agent-name"
                placeholder="Nom complet de l'agent"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-phone">Téléphone <span className="text-red-500">*</span></Label>
              <Input
                id="agent-phone"
                type="tel"
                placeholder="+228 90 12 34 56"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-password">Mot de passe <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="agent-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe sécurisé"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  className="bg-muted/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pays <span className="text-red-500">*</span></Label>
              <Select
                value={createForm.country}
                onValueChange={(val) => setCreateForm((f) => ({ ...f, country: val }))}
              >
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Sélectionnez un pays" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label} ({c.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-location">Localisation</Label>
              <Input
                id="agent-location"
                placeholder="Ville ou adresse (optionnel)"
                value={createForm.location}
                onChange={(e) => setCreateForm((f) => ({ ...f, location: e.target.value }))}
                className="bg-muted/50"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={createLoading}>
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handleCreateAgent}
              disabled={createLoading}
            >
              {createLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Suspend / Reactivate Dialog ──────────────────────────── */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {suspendTarget?.suspended ? (
                <>
                  <RotateCcw className="h-5 w-5 text-emerald-600" />
                  Réactiver l&apos;agent
                </>
              ) : (
                <>
                  <Ban className="h-5 w-5 text-amber-600" />
                  Suspendre l&apos;agent
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {suspendTarget?.suspended
                ? `Voulez-vous réactiver ${suspendTarget?.name} ?`
                : `Voulez-vous suspendre ${suspendTarget?.name} ? L'agent ne pourra plus accéder à ses services.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">
                {suspendTarget?.suspended ? 'Note (optionnel)' : 'Raison de la suspension'}
              </Label>
              <Textarea
                id="suspend-reason"
                placeholder={suspendTarget?.suspended ? 'Ajoutez une note si nécessaire...' : 'Décrivez la raison...'}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="bg-muted/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} disabled={suspendLoading}>
              Annuler
            </Button>
            <Button
              className={`font-medium ${
                suspendTarget?.suspended
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
              onClick={handleSuspendSubmit}
              disabled={suspendLoading || (!suspendTarget?.suspended && !suspendReason.trim())}
            >
              {suspendLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Traitement...
                </>
              ) : suspendTarget?.suspended ? (
                'Réactiver'
              ) : (
                'Suspendre'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Supprimer l&apos;agent
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                <p className="mb-2">
                  Cette action <strong>désactive définitivement</strong> l&apos;agent{' '}
                  <strong>{deleteTarget?.name}</strong>
                  {deleteTarget?.agentCode && (
                    <> (code: <code className="font-mono">{deleteTarget.agentCode}</code>)</>
                  )}
                  . L&apos;historique financier est conservé pour audit.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Désactivation...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Désactiver l&apos;agent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Approve Pending Agent Dialog ──────────────────────────── */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <UserCheck className="h-5 w-5" />
              Valider l&apos;agent
            </DialogTitle>
            <DialogDescription>
              Valider <strong>{approveTarget?.name}</strong> ({approveTarget?.phone}).
              Un code agent unique sera généré automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={sendEmailOnApprove}
                onChange={(e) => setSendEmailOnApprove(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-emerald-600"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-emerald-600" />
                  Envoyer les identifiants par email
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Message prédéfini avec le code agent. L&apos;agent se connecte avec son
                  mot de passe d&apos;inscription.
                </p>
                {!approveTarget?.email && (
                  <p className="text-xs text-amber-600 mt-1">
                    Cet agent n&apos;a pas d&apos;email — l&apos;envoi sera ignoré.
                  </p>
                )}
              </div>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={approveLoading}>
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handleApproveConfirm}
              disabled={approveLoading}
            >
              {approveLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Validation...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Valider
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Approve Result Dialog ─────────────────────────────────── */}
      <Dialog open={approveResultOpen} onOpenChange={setApproveResultOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <UserCheck className="h-5 w-5" />
              Agent validé
            </DialogTitle>
            <DialogDescription>
              Le compte est actif. L&apos;agent peut se connecter immédiatement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Code agent généré</p>
              <p className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400 tracking-widest">
                {approvedCode}
              </p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong className="text-foreground">Connexion :</strong> numéro de téléphone +
                mot de passe d&apos;inscription.
              </p>
              {approveEmailSent ? (
                <p className="text-emerald-600">
                  Email prédéfini envoyé avec le code et les instructions.
                </p>
              ) : (
                <p className="text-amber-600">
                  Email non envoyé (pas d&apos;adresse ou échec SMTP). Transmettez le code
                  manuellement.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={() => setApproveResultOpen(false)}
            >
              Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
