'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Users,
  Ban,
  RotateCcw,
  Trash2,
  Loader2,
  Phone,
  AtSign,
  Calendar,
  ArrowLeftRight,
  Wallet,
  X,
  AlertTriangle,
  Check,
  ShoppingBag,
  Key,
  Eye,
  EyeOff,
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
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface UserCard {
  id: string;
  name: string;
  phone: string;
  pseudo: string;
  role: string;
  realBalance: number;
  bonusBalance: number;
  suspended: boolean;
  validationStatus: string;
  createdAt: string;
  _count?: {
    sentTransactions?: number;
    receivedTransactions?: number;
  };
  transactionCount?: number;
}

type FilterTab = 'all' | 'clients' | 'agents' | 'sellers' | 'suspended' | 'active';

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'clients', label: 'Clients' },
  { key: 'agents', label: 'Agents' },
  { key: 'sellers', label: 'Services' },
  { key: 'suspended', label: 'Suspendus' },
  { key: 'active', label: 'Actifs' },
];

const predefinedReasons = [
  'Activité suspecte',
  'Fraude',
  'Non-respect des règles',
  'Vérification en attente',
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

export default function AdminUsersScreen() {
  const { admin, goBack } = useAppStore();
  const [users, setUsers] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Suspend modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<UserCard | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [selectedPredefined, setSelectedPredefined] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserCard | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reset password
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdTarget, setResetPwdTarget] = useState<UserCard | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [resetPwdLoading, setResetPwdLoading] = useState(false);

  const fetchUsers = useCallback(async (page: number, append: boolean) => {
    if (!append) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      if (activeFilter === 'clients') params.set('role', 'client');
      else if (activeFilter === 'agents') params.set('role', 'agent');
      else if (activeFilter === 'sellers') params.set('role', 'seller');
      else if (activeFilter === 'suspended') params.set('suspended', 'true');
      else if (activeFilter === 'active') params.set('suspended', 'false');

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        const fetchedUsers: UserCard[] = data.users.map((u: UserCard) => ({
          ...u,
          transactionCount: (u._count?.sentTransactions ?? 0) + (u._count?.receivedTransactions ?? 0),
        }));

        if (append) {
          setUsers((prev) => [...prev, ...fetchedUsers]);
        } else {
          setUsers(fetchedUsers);
        }
        setHasMore(fetchedUsers.length >= 10);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    setCurrentPage(1);
    fetchUsers(1, false);
  }, [fetchUsers]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers(1, false);
  }

  function handleFilterChange(filter: FilterTab) {
    setActiveFilter(filter);
    // fetchUsers will be called via useEffect due to dependency change
  }

  function handleLoadMore() {
    fetchUsers(currentPage + 1, true);
  }

  // ─── Suspend / Reactivate ──────────────────────────────────────────

  function openSuspendModal(user: UserCard) {
    setSuspendTarget(user);
    setSuspendReason('');
    setSelectedPredefined('');
    setSuspendModalOpen(true);
  }

  function handlePredefinedReason(reason: string) {
    setSelectedPredefined(reason);
    setSuspendReason(reason);
  }

  async function handleSuspendSubmit() {
    if (!suspendTarget || !suspendReason.trim()) {
      toast.error('Veuillez saisir une raison');
      return;
    }
    if (!admin?.id) {
      toast.error('Session admin invalide');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: suspendTarget.id,
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
        setSuspendModalOpen(false);
        setSuspendTarget(null);
        // Refresh user list
        fetchUsers(1, false);
      } else {
        toast.error(data.error || 'Action échouée');
      }
    } catch (err) {
      console.error('Suspend error:', err);
      toast.error('Erreur lors de l\'action');
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Validate / Reject Seller ──────────────────────────────────────

  async function handleSellerValidation(userId: string, action: 'validate_seller' | 'reject_seller') {
    if (!admin?.id) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          adminId: admin.id,
          action,
          reason: action === 'reject_seller' ? 'Rejeté par l\'administrateur' : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchUsers(1, false);
      } else {
        toast.error(data.message || 'Action échouée');
      }
    } catch (err) {
      toast.error('Erreur lors de l\'action');
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────

  function openDeleteDialog(user: UserCard) {
    setDeleteTarget(user);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !admin?.id) {
      toast.error('Données manquantes');
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: deleteTarget.id,
          adminId: admin.id,
          action: 'delete',
          reason: 'Suppression par administrateur',
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${deleteTarget.name} a été supprimé`);
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        fetchUsers(1, false);
      } else {
        toast.error(data.error || 'Échec de la suppression');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────

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
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Retour</span>
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              Gestion Utilisateurs
            </h1>
            <p className="text-xs text-muted-foreground">
              {users.length} utilisateur{users.length !== 1 ? 's' : ''} trouvé{users.length !== 1 ? 's' : ''}
            </p>
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
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher par nom, téléphone, pseudo..."
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
          </form>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: 'easeOut' as const }}
          className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        <Separator />

        {/* Users List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-14 rounded-full" />
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
        ) : users.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' as const }}
          >
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-base font-medium text-foreground mb-1">
                  Aucun utilisateur trouvé
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Essayez de modifier vos critères de recherche ou de filtre
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <div className="space-y-3">
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03, ease: 'easeOut' as const }}
                >
                  <Card className={`border-border hover:shadow-md transition-shadow ${
                    user.suspended ? 'border-red-200 dark:border-red-800/40' : ''
                  }`}>
                    <CardContent className="p-4">
                      {/* Top row: name + role + actions */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {user.name}
                          </h3>
                          <Badge
                            className={`text-xs font-medium ${
                              user.role === 'agent'
                                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/40'
                                : user.role === 'seller'
                                ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800/40'
                                : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40'
                            }`}
                          >
                            {user.role === 'agent' ? 'Agent' : user.role === 'seller' ? 'Service' : 'Client'}
                          </Badge>
                          {user.suspended && (
                            <Badge variant="destructive" className="text-xs">
                              Suspendu
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-md ${
                              user.suspended
                                ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            }`}
                            onClick={() => openSuspendModal(user)}
                            title={user.suspended ? 'Réactiver' : 'Suspendre'}
                          >
                            {user.suspended ? (
                              <RotateCcw className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                            <span className="sr-only">
                              {user.suspended ? 'Réactiver' : 'Suspendre'}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => openDeleteDialog(user)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Supprimer</span>
                          </Button>
                          {user.role === 'seller' && user.validationStatus === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={() => handleSellerValidation(user.id, 'validate_seller')}
                                disabled={actionLoading}
                                title="Valider le service"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => handleSellerValidation(user.id, 'reject_seller')}
                                disabled={actionLoading}
                                title="Rejeter le service"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {user.role === 'seller' && user.validationStatus === 'rejected' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              onClick={() => handleSellerValidation(user.id, 'validate_seller')}
                              disabled={actionLoading}
                                title="Ré-approuver le service"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{user.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AtSign className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">@{user.pseudo}</span>
                        </div>
                        {user.role === 'seller' && (
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                            <Badge
                              className={`text-xs font-medium ${
                                user.validationStatus === 'validated'
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40'
                                  : user.validationStatus === 'rejected'
                                  ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/40'
                                  : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800/40'
                              }`}
                            >
                              {user.validationStatus === 'validated'
                                ? 'Validé'
                                : user.validationStatus === 'rejected'
                                ? 'Rejeté'
                                : 'En attente'}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <Separator className="my-3" />

                      {/* Bottom row: balance, date, tx count */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-medium text-foreground">
                            {formatBalance(user.realBalance + user.bonusBalance)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                          <span>{user.transactionCount ?? 0} tx</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(user.createdAt)}</span>
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

      {/* ─── Suspend / Reactivate Modal ───────────────────────────── */}
      <Dialog open={suspendModalOpen} onOpenChange={setSuspendModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {suspendTarget?.suspended ? (
                <>
                  <RotateCcw className="h-5 w-5 text-emerald-600" />
                  Réactiver le compte
                </>
              ) : (
                <>
                  <Ban className="h-5 w-5 text-amber-600" />
                  Suspendre le compte
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {suspendTarget?.suspended
                ? `Voulez-vous réactiver le compte de ${suspendTarget?.name} ?`
                : `Voulez-vous suspendre le compte de ${suspendTarget?.name} ? L'utilisateur ne pourra plus accéder à ses services.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!suspendTarget?.suspended && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Raison prédéfinie
                </Label>
                <div className="flex flex-wrap gap-2">
                  {predefinedReasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => handlePredefinedReason(reason)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                        selectedPredefined === reason
                          ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="suspend-reason">
                {suspendTarget?.suspended ? 'Note (optionnel)' : 'Raison de la suspension'}
              </Label>
              <Textarea
                id="suspend-reason"
                placeholder={
                  suspendTarget?.suspended
                    ? 'Ajoutez une note si nécessaire...'
                    : 'Décrivez la raison...'
                }
                value={suspendReason}
                onChange={(e) => {
                  setSuspendReason(e.target.value);
                  setSelectedPredefined('');
                }}
                rows={3}
                className="bg-muted/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSuspendModalOpen(false)}
              disabled={actionLoading}
            >
              Annuler
            </Button>
            <Button
              className={`font-medium ${
                suspendTarget?.suspended
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
              onClick={handleSuspendSubmit}
              disabled={actionLoading || (!suspendTarget?.suspended && !suspendReason.trim())}
            >
              {actionLoading ? (
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

      {/* ─── Reset Password Dialog ──────────────────────────────── */}
      <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Key className="h-5 w-5" />
              Réinitialiser le mot de passe
            </DialogTitle>
            <DialogDescription>
              Définissez un nouveau mot de passe pour <strong>{resetPwdTarget?.name}</strong>.
              Le nouveau mot de passe sera envoyé par email à l'utilisateur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPwd ? 'text' : 'password'}
                  placeholder="Minimum 4 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {newPassword.length > 0 && newPassword.length < 4 && (
              <p className="text-xs text-red-500">Minimum 4 caractères</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResetPwdOpen(false)} disabled={resetPwdLoading}>
              Annuler
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={async () => {
                if (!resetPwdTarget || newPassword.length < 4) return;
                setResetPwdLoading(true);
                try {
                  const res = await fetch('/api/admin/users/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: resetPwdTarget.id, newPassword }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    toast.success(data.message);
                    setResetPwdOpen(false);
                  } else {
                    toast.error(data.message || 'Erreur');
                  }
                } catch {
                  toast.error('Erreur de connexion');
                } finally {
                  setResetPwdLoading(false);
                }
              }}
              disabled={resetPwdLoading || newPassword.length < 4}
            >
              {resetPwdLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Traitement...</>
              ) : (
                'Réinitialiser'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ───────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Supprimer l&apos;utilisateur
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                <p className="mb-2">
                  Cette action est <strong>irréversible</strong>. Toutes les données associées à{' '}
                  <strong>{deleteTarget?.name}</strong> seront définitivement supprimées, y compris :
                </p>
                <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                  <li>Historique des transactions</li>
                  <li>Solde et bonus</li>
                  <li>Offres de troc</li>
                  <li>Achats marketplace</li>
                  <li>Notifications</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
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
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
