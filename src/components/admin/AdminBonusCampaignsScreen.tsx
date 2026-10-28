'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Megaphone,
  Pause,
  Play,
  CheckCircle2,
  Calendar,
  Users,
  DollarSign,
  Gift,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

type CampaignStatus = 'active' | 'paused' | 'completed' | 'expired';

interface BonusCampaign {
  id: string;
  name: string;
  description: string;
  bonusAmount: number;
  currency: string;
  target: 'all' | 'new' | 'specific';
  targetUserIds: string[];
  maxDistributions: number;
  currentDistributions: number;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(amount: number, currency: string): string {
  if (currency === 'FC') {
    return `${amount.toLocaleString('fr-FR')} CDF`;
  }
  return `$${amount.toFixed(2)}`;
}

function getStatusBadge(status: CampaignStatus): { label: string; className: string } {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40',
      };
    case 'paused':
      return {
        label: 'En Pause',
        className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/40',
      };
    case 'completed':
      return {
        label: 'Terminée',
        className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
      };
    case 'expired':
      return {
        label: 'Expirée',
        className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/40',
      };
    default:
      return { label: status, className: 'bg-muted text-muted-foreground' };
  }
}

function getTargetLabel(target: string): string {
  switch (target) {
    case 'all': return 'Tous les utilisateurs';
    case 'new': return 'Nouveaux utilisateurs';
    case 'specific': return 'Utilisateurs spécifiques';
    default: return target;
  }
}

const emptyCampaign: Omit<BonusCampaign, 'id' | 'currentDistributions' | 'status' | 'createdAt' | 'startDate'> = {
  name: '',
  description: '',
  bonusAmount: 0,
  currency: 'USD',
  target: 'all',
  targetUserIds: [],
  maxDistributions: 100,
  endDate: '',
};

export default function AdminBonusCampaignsScreen() {
  const { admin, goBack } = useAppStore();
  const [campaigns, setCampaigns] = useState<BonusCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create campaign modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState(emptyCampaign);
  const [creating, setCreating] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bonus/campaigns');
      const data = await res.json();

      if (data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      toast.error('Erreur lors du chargement des campagnes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  function handleOpenCreate() {
    setNewCampaign(emptyCampaign);
    setCreateOpen(true);
  }

  async function handleCreateCampaign() {
    if (!newCampaign.name.trim()) {
      toast.error('Veuillez entrer un nom de campagne');
      return;
    }
    if (!newCampaign.bonusAmount || newCampaign.bonusAmount <= 0) {
      toast.error('Veuillez entrer un montant bonus valide');
      return;
    }
    if (!newCampaign.endDate) {
      toast.error('Veuillez entrer une date de fin');
      return;
    }
    if (!admin?.id) {
      toast.error('Session admin invalide');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/bonus/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCampaign,
          adminId: admin.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Campagne "${newCampaign.name}" créée avec succès`);
        setCreateOpen(false);
        setNewCampaign(emptyCampaign);
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Échec de la création de la campagne');
      }
    } catch (err) {
      console.error('Create campaign error:', err);
      toast.error('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  }

  async function handleCampaignAction(campaignId: string, action: 'pause' | 'resume' | 'complete') {
    if (!admin?.id) return;

    setActionLoading(campaignId);
    try {
      const res = await fetch('/api/bonus/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          adminId: admin.id,
          action,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const messages: Record<string, string> = {
          pause: 'Campagne mise en pause',
          resume: 'Campagne relancée',
          complete: 'Campagne marquée comme terminée',
        };
        toast.success(messages[action] || 'Action réussie');
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Action échouée');
      }
    } catch (err) {
      console.error('Campaign action error:', err);
      toast.error('Erreur lors de l\'action');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Sticky Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' as const }}
        className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={goBack}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Retour</span>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Megaphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground leading-tight">
                  Campagnes Bonus
                </h1>
                <p className="text-xs text-muted-foreground">
                  {campaigns.filter(c => c.status === 'active').length} campagne(s) active(s)
                </p>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleOpenCreate}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Nouvelle Campagne</span>
            <span className="sm:hidden">Créer</span>
          </Button>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-4">
        {/* Campaigns List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' as const }}
          >
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-base font-medium text-foreground mb-1">
                  Aucune campagne
                </p>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Créez votre première campagne bonus pour récompenser vos utilisateurs
                </p>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleOpenCreate}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Créer une campagne
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign, index) => {
              const statusBadge = getStatusBadge(campaign.status);
              const progressPercent = campaign.maxDistributions > 0
                ? Math.min(100, (campaign.currentDistributions / campaign.maxDistributions) * 100)
                : 0;

              return (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04, ease: 'easeOut' as const }}
                >
                  <Card className="border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Header: Name + Status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Gift className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {campaign.name}
                          </h3>
                        </div>
                        <Badge className={`text-xs shrink-0 ${statusBadge.className}`}>
                          {statusBadge.label}
                        </Badge>
                      </div>

                      {/* Description */}
                      {campaign.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {campaign.description}
                        </p>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <DollarSign className="h-3 w-3 text-emerald-600" />
                            <span className="text-xs text-muted-foreground">Montant</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatAmount(campaign.bonusAmount, campaign.currency)}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Users className="h-3 w-3 text-purple-600" />
                            <span className="text-xs text-muted-foreground">Cible</span>
                          </div>
                          <p className="text-xs font-medium text-foreground leading-tight">
                            {getTargetLabel(campaign.target)}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <BarChart3 className="h-3 w-3 text-amber-600" />
                            <span className="text-xs text-muted-foreground">Progression</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {campaign.currentDistributions}/{campaign.maxDistributions}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.8, delay: index * 0.05, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              progressPercent >= 100
                                ? 'bg-gray-400'
                                : progressPercent >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Date Range */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
                      </div>

                      <Separator className="my-2" />

                      {/* Actions */}
                      {(campaign.status === 'active' || campaign.status === 'paused') && (
                        <div className="flex gap-2">
                          {campaign.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800/40 dark:text-amber-400 dark:hover:bg-amber-900/20"
                              onClick={() => handleCampaignAction(campaign.id, 'pause')}
                              disabled={actionLoading === campaign.id}
                            >
                              {actionLoading === campaign.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Pause className="h-3.5 w-3.5 mr-1.5" />
                                  Pause
                                </>
                              )}
                            </Button>
                          )}
                          {campaign.status === 'paused' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800/40 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                              onClick={() => handleCampaignAction(campaign.id, 'resume')}
                              disabled={actionLoading === campaign.id}
                            >
                              {actionLoading === campaign.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Play className="h-3.5 w-3.5 mr-1.5" />
                                  Relancer
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                            onClick={() => handleCampaignAction(campaign.id, 'complete')}
                            disabled={actionLoading === campaign.id}
                          >
                            {actionLoading === campaign.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                Terminer
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-purple-600" />
              Nouvelle Campagne Bonus
            </DialogTitle>
            <DialogDescription>
              Créez une campagne de distribution de bonus pour vos utilisateurs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="campaign-name" className="text-sm font-medium">
                Nom de la campagne *
              </Label>
              <Input
                id="campaign-name"
                placeholder="Ex: Bonus de bienvenue"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                className="bg-muted/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="campaign-desc" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="campaign-desc"
                placeholder="Décrivez cette campagne..."
                value={newCampaign.description}
                onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                rows={2}
                className="bg-muted/50 resize-none"
              />
            </div>

            {/* Amount + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="campaign-amount" className="text-sm font-medium">
                  Montant bonus *
                </Label>
                <Input
                  id="campaign-amount"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 500"
                  value={newCampaign.bonusAmount || ''}
                  onChange={(e) => setNewCampaign({ ...newCampaign, bonusAmount: parseFloat(e.target.value) || 0 })}
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Devise</Label>
                <Select value={newCampaign.currency} onValueChange={(v) => setNewCampaign({ ...newCampaign, currency: v })}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="Devise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="FC">CDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cible</Label>
              <Select value={newCampaign.target} onValueChange={(v: 'all' | 'new' | 'specific') => setNewCampaign({ ...newCampaign, target: v })}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Choisir la cible" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  <SelectItem value="new">Nouveaux utilisateurs</SelectItem>
                  <SelectItem value="specific">Utilisateurs spécifiques</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Distributions + End Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="campaign-max" className="text-sm font-medium">
                  Max distributions
                </Label>
                <Input
                  id="campaign-max"
                  type="number"
                  placeholder="100"
                  value={newCampaign.maxDistributions || ''}
                  onChange={(e) => setNewCampaign({ ...newCampaign, maxDistributions: parseInt(e.target.value) || 0 })}
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-end" className="text-sm font-medium">
                  Date de fin *
                </Label>
                <Input
                  id="campaign-end"
                  type="date"
                  value={newCampaign.endDate}
                  onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                  className="bg-muted/50"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handleCreateCampaign}
              disabled={creating || !newCampaign.name.trim() || !newCampaign.bonusAmount || !newCampaign.endDate}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Créer la campagne
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
