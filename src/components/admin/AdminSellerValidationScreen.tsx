'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  UserCheck,
  XCircle,
  FileText,
  Phone,
  MapPin,
  Tag,
  Calendar,
  Send,
  Loader2,
  AlertCircle,
  User,
  Search,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface SellerRequest {
  id: string;
  name: string;
  phone: string;
  pseudo: string;
  businessName: string;
  businessType: string;
  location: string;
  email: string | null;
  photoId: string | null;
  validationStatus: string;
  createdAt: string;
}

export default function AdminSellerValidationScreen() {
  const { admin, goBack } = useAppStore();
  const adminToken = admin?.token;
  const adminHeaders: Record<string, string> = adminToken
    ? { Authorization: `Bearer ${adminToken}` }
    : {};
  const [sellers, setSellers] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'pending' | 'rejected' | 'all'>('pending');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerRequest | null>(null);
  const [actionType, setActionType] = useState<'validate' | 'reject' | 'hold'>('validate');
  const [justificationMessage, setJustificationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/seller-validation?status=${filter === 'all' ? '' : filter}&search=${encodeURIComponent(searchQuery)}`,
        { headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined }
      );
      const data = await res.json();
      if (data.success) {
        setSellers(Array.isArray(data.sellers) ? data.sellers : []);
      } else {
        toast.error(data.message || 'Erreur lors du chargement des demandes');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, adminToken]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const handleActionClick = (seller: SellerRequest, type: 'validate' | 'reject' | 'hold') => {
    setSelectedSeller(seller);
    setActionType(type);
    setJustificationMessage(
      type === 'validate'
        ? `Bienvenue chez TRAIT ! Votre boutique "${seller.businessName}" est validée.`
        : type === 'reject'
        ? `Votre demande a été refusée car vos informations ne sont pas complètes.`
        : `Votre dossier est mis en attente. Veuillez fournir des justificatifs supplémentaires.`
    );
    setModalOpen(true);
  };

  const handleModalSubmit = async () => {
    if (!selectedSeller) return;
    if (!justificationMessage.trim()) {
      toast.error('Un message de justification est obligatoire.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/seller-validation', {
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
          actionType === 'validate' ? 'Validé' : actionType === 'reject' ? 'Refusé' : 'Mis en attente'
        }`);
        setModalOpen(false);
        fetchSellers();
      } else {
        toast.error(data.message || "Erreur lors de l'enregistrement");
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const translateBusinessType = (type: string) => {
    const map: Record<string, string> = {
      vetements: '👗 Vêtements & Mode',
      electronique: '🔌 Électronique',
      alimentation: '🍎 Alimentation',
      services: '💼 Services',
      autre: '📦 Autre',
    };
    return map[type] || type;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={goBack} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">Validation Services</h1>
            <p className="text-xs text-gray-500">{sellers.length} demande(s) affichée(s)</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher boutique, nom, téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900 border-gray-200"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'rejected'
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              Refusés
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              Tous
            </button>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 bg-gray-100 dark:bg-slate-850 animate-pulse rounded-2xl border" />
            ))}
          </div>
        ) : sellers.length === 0 ? (
          <Card className="border-dashed border-2 py-12 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-bold text-gray-750 dark:text-white">Aucune demande service</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Il n'y a actuellement aucune demande de compte service correspondant à vos filtres.
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
                  <Card className="overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Info details */}
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-850 flex items-center justify-center border text-blue-600 dark:text-blue-400">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-gray-850 dark:text-white flex items-center gap-2">
                                {seller.businessName}
                              </h3>
                              <p className="text-xs text-gray-500">
                                Propriétaire : <span className="font-medium">{seller.name}</span> (@{seller.pseudo})
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>{seller.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>{translateBusinessType(seller.businessType)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>{seller.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>Inscrit le {formatDate(seller.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex md:flex-col gap-2 shrink-0 md:w-48 justify-end">
                          {seller.validationStatus === 'pending' ? (
                            <>
                              <Button
                                onClick={() => handleActionClick(seller, 'validate')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1.5"
                              >
                                <UserCheck className="w-4 h-4" />
                                Valider
                              </Button>
                              <Button
                                onClick={() => handleActionClick(seller, 'reject')}
                                variant="outline"
                                className="flex-1 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 rounded-xl text-xs gap-1.5"
                              >
                                <XCircle className="w-4 h-4" />
                                Refuser
                              </Button>
                              <Button
                                onClick={() => handleActionClick(seller, 'hold')}
                                variant="ghost"
                                className="flex-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl text-xs gap-1.5 border border-dashed border-amber-300"
                              >
                                <Clock className="w-4 h-4" />
                                Attente
                              </Button>
                            </>
                          ) : (
                            <div className="w-full flex justify-end">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  seller.validationStatus === 'validated'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {seller.validationStatus === 'validated' ? 'Validé ✓' : 'Refusé ✗'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'validate' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Approuver la boutique
                </>
              ) : actionType === 'reject' ? (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Refuser la boutique
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-amber-600" />
                  Mettre le dossier en attente
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'validate'
                ? `Veuillez saisir le message de bienvenue que recevra le service.`
                : `Veuillez spécifier le motif administratif de votre décision.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="justification-message" className="text-xs font-bold text-gray-700">
                Message envoyé au Service *
              </Label>
              <Textarea
                id="justification-message"
                placeholder="Rédigez votre message de justification ici..."
                value={justificationMessage}
                onChange={(e) => setJustificationMessage(e.target.value)}
                rows={4}
                className="bg-gray-50 border-gray-200 resize-none rounded-xl text-sm"
                required
              />
              <p className="text-[10px] text-gray-400">
                Ce message sera envoyé en notification au service et justifiera l'action commise.
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
                actionType === 'validate'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : actionType === 'reject'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirmer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
