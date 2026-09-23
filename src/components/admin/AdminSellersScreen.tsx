'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Store,
  Ban,
  RotateCcw,
  Trash2,
  Phone,
  MapPin,
  Tag,
  Wallet,
  Calendar,
  Loader2,
  AlertTriangle,
  Send,
  Users,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface Seller {
  id: string;
  name: string;
  phone: string;
  pseudo: string;
  email: string | null;
  businessName: string;
  businessType: string;
  location: string;
  validationStatus: string;
  validationRejectReason: string | null;
  realBalance: number;
  realBalanceFC: number;
  bonusBalance: number;
  bonusBalanceFC: number;
  suspended: boolean;
  suspensionReason: string | null;
  createdAt: string;
}

interface SellersStats {
  totalSellers: number;
  validatedSellers: number;
  pendingSellers: number;
  rejectedSellers: number;
  suspendedSellers: number;
}

export default function AdminSellersScreen() {
  const { admin, goBack } = useAppStore();
  const adminToken = admin?.token;
  const adminHeaders: Record<string, string> = adminToken
    ? { Authorization: `Bearer ${adminToken}` }
    : {};
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [stats, setStats] = useState<SellersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'activate' | 'delete'>('suspend');
  const [justificationMessage, setJustificationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/admin/sellers?${params.toString()}`, {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
      });
      const data = await res.json();
      if (data.success) {
        setSellers(Array.isArray(data.sellers) ? data.sellers : []);
        setStats(data.stats ?? null);
        setTotalPages(data.totalPages || 1);
      } else {
        toast.error(data.message || 'Erreur lors du chargement des services');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, page, adminToken]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const handleActionClick = (seller: Seller, type: 'suspend' | 'activate' | 'delete') => {
    setSelectedSeller(seller);
    setActionType(type);
    setJustificationMessage(
      type === 'suspend'
        ? `Suspension temporaire pour non-conformité aux directives de vente.`
        : type === 'activate'
        ? `Réactivation du compte suite à la régularisation de la situation.`
        : `Suppression du compte à la demande de l'utilisateur ou pour infraction grave.`
    );
    setModalOpen(true);
  };

  const handleModalSubmit = async () => {
    if (!selectedSeller) return;
    if (!justificationMessage.trim()) {
      toast.error('Un message de justification est requis.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          adminId: admin?.id,
          action: actionType,
          sellerId: selectedSeller.id,
          reason: justificationMessage.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Action enregistrée avec succès : ${
          actionType === 'suspend' ? 'Suspendu' : actionType === 'activate' ? 'Activé' : 'Supprimé'
        }`);
        setModalOpen(false);
        fetchSellers();
      } else {
        toast.error(data.message || "Erreur lors de l'action");
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const translateBusinessType = (type: string) => {
    const map: Record<string, string> = {
      vetements: '👗 Vêtements',
      electronique: '🔌 Électronique',
      alimentation: '🍎 Alimentation',
      services: '💼 Services',
      autre: '📦 Autre',
    };
    return map[type] || type;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 max-w-5xl mx-auto">
          <Button variant="ghost" size="icon" onClick={goBack} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">Gestion des Services</h1>
            <p className="text-xs text-gray-500">
              {stats ? `${stats.totalSellers} services au total` : 'Chargement...'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* Stats Summary Widgets */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border border-gray-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400">Total Services</p>
                <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {stats.totalSellers}
                </h3>
              </CardContent>
            </Card>
            <Card className="border border-gray-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400">Actifs / Validés</p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.validatedSellers}
                </h3>
              </CardContent>
            </Card>
            <Card className="border border-gray-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400">Suspendus</p>
                <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {stats.suspendedSellers}
                </h3>
              </CardContent>
            </Card>
            <Card className="border border-gray-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400">En Attente</p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {stats.pendingSellers}
                </h3>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher boutique, activité, localisation, téléphone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-white dark:bg-slate-900 border-gray-200"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => {
                setFilter('all');
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => {
                setFilter('active');
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'active'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              Actifs
            </button>
            <button
              onClick={() => {
                setFilter('suspended');
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'suspended'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              Suspendus
            </button>
            <button
              onClick={() => {
                setFilter('pending');
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              En attente
            </button>
          </div>
        </div>

        {/* Vendors List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 bg-gray-100 dark:bg-slate-850 animate-pulse rounded-2xl border" />
            ))}
          </div>
        ) : sellers.length === 0 ? (
          <Card className="border-dashed border-2 py-12 flex flex-col items-center justify-center text-center">
            <Store className="w-12 h-12 text-gray-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-bold text-gray-750 dark:text-white">Aucun service</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Aucun service correspondant n'a été trouvé dans le système.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {sellers.map((seller) => (
                <motion.div
                  key={seller.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={`overflow-hidden border shadow-sm hover:shadow-md transition-shadow ${
                    seller.suspended
                      ? 'border-red-200 bg-red-50/10 dark:border-red-950 dark:bg-red-950/5'
                      : 'border-gray-100 dark:border-slate-800'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Core details */}
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-slate-850 flex items-center justify-center border text-purple-600 dark:text-purple-400">
                              <Store className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-gray-850 dark:text-white flex items-center gap-2">
                                {seller.businessName || seller.name || 'Service'}
                                {seller.suspended ? (
                                  <Badge variant="destructive" className="text-[10px] font-bold py-0.5 px-2">
                                    Suspendu
                                  </Badge>
                                ) : seller.validationStatus === 'validated' ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold py-0.5 px-2">
                                    Actif
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold py-0.5 px-2">
                                    En Attente
                                  </Badge>
                                )}
                              </h3>
                              <p className="text-xs text-gray-500">
                                Gérant : <span className="font-medium">{seller.name || '—'}</span>
                                {seller.pseudo ? ` (@${seller.pseudo})` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>{seller.phone || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>{translateBusinessType(seller.businessType || '')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>{seller.location || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>Créé le {formatDate(seller.createdAt)}</span>
                            </div>
                          </div>

                          {/* Suspended Reason Banner */}
                          {seller.suspended && seller.suspensionReason && (
                            <div className="mt-3 p-3 bg-red-100/40 dark:bg-red-950/20 text-xs text-red-700 dark:text-red-300 rounded-xl flex items-start gap-2 border border-red-200/50">
                              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Motif de suspension :</span> {seller.suspensionReason}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions + Balance */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 shrink-0 md:w-52 border-t md:border-t-0 pt-4 md:pt-0">
                          {/* Balance info */}
                          <div className="text-left md:text-right">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Solde Real</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-base font-extrabold text-gray-800 dark:text-white">
                                ${(Number(seller.realBalance) || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Admin management buttons */}
                          <div className="flex gap-1.5 w-full justify-end">
                            {seller.suspended ? (
                              <Button
                                onClick={() => handleActionClick(seller, 'activate')}
                                variant="outline"
                                className="flex-1 bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 hover:text-emerald-700 border-emerald-200 rounded-xl text-xs gap-1 py-4"
                                title="Activer/Réactiver"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Activer
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleActionClick(seller, 'suspend')}
                                variant="outline"
                                className="flex-1 text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50 rounded-xl text-xs gap-1 py-4"
                                title="Suspendre/Désactiver"
                                disabled={seller.validationStatus !== 'validated'}
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Suspendre
                              </Button>
                            )}

                            <Button
                              onClick={() => handleActionClick(seller, 'delete')}
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl p-2 h-9 w-9 shrink-0 border"
                              title="Supprimer définitivement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="rounded-lg"
                >
                  Précédent
                </Button>
                <span className="text-xs text-gray-500">
                  Page {page} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="rounded-lg"
                >
                  Suivant
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'suspend' ? (
                <>
                  <Ban className="h-5 w-5 text-amber-600" />
                  Suspendre le service
                </>
              ) : actionType === 'activate' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Réactiver le service
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Suppression définitive
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'delete'
                ? `Attention : Cette action supprimera définitivement le commerce "${selectedSeller?.businessName}" et ses produits associés.`
                : `Veuillez spécifier la justification administrative pour cette action.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="justification-message" className="text-xs font-bold text-gray-700">
                Message de Justification *
              </Label>
              <Textarea
                id="justification-message"
                placeholder="Expliquez la raison de cette action..."
                value={justificationMessage}
                onChange={(e) => setJustificationMessage(e.target.value)}
                rows={4}
                className="bg-gray-50 border-gray-200 resize-none rounded-xl text-sm"
                required
              />
              <p className="text-[10px] text-gray-400">
                Ce message sera envoyé au service (sauf suppression) et consigné dans l'historique d'activité de l'administration.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting} className="rounded-xl">
              Annuler
            </Button>
            <Button
              onClick={handleModalSubmit}
              disabled={submitting || !justificationMessage.trim()}
              className={`rounded-xl font-semibold text-white ${
                actionType === 'suspend'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : actionType === 'activate'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-650 hover:bg-red-700'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Traitement...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Valider l'action
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
