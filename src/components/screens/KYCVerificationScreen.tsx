'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldX,
  Upload,
  Camera,
  FileText,
  Loader2,
  Check,
  AlertTriangle,
  Info,
  Lock,
  Eye,
  EyeOff,
  CreditCard,
  Clock,
  User,
  Mail,
  Phone,
  IdCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';

// ─── Types ────────────────────────────────────────────────────────────

interface KYCStatus {
  status: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectReason: string | null;
  documentType: string | null;
}

interface SecurityInfo {
  dailyTransactions: number;
  dailyLimit: number;
  remainingToday: number;
  limitReached: boolean;
}

// ─── Component ────────────────────────────────────────────────────────

export default function KYCVerificationScreen() {
  const { user, goBack, navigateTo } = useAppStore();

  const [kyc, setKyc] = useState<KYCStatus | null>(null);
  const [security, setSecurity] = useState<SecurityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [documentType, setDocumentType] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [documentUploading, setDocumentUploading] = useState(false);
  const [selfieUploading, setSelfieUploading] = useState(false);

  // Confirm dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // ─── Fetch KYC status ─────────────────────────────────────────────

  const fetchKYCStatus = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const token = useAppStore.getState().token;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/kyc?userId=${user.id}`, { headers });
      const data = await res.json();
      if (data.success) {
        setKyc(data.kyc);
        setSecurity(data.security);
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchKYCStatus();
  }, [fetchKYCStatus]);

  // ─── Upload handlers ──────────────────────────────────────────────

  async function handleFileUpload(file: File, type: 'document' | 'selfie') {
    const setUploading = type === 'document' ? setDocumentUploading : setSelfieUploading;
    const setUrl = type === 'document' ? setDocumentUrl : setSelfieUrl;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const token = useAppStore.getState().token;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/upload-kyc', {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUrl(data.url);
        toast.success(`${type === 'document' ? 'Document' : 'Selfie'} uploadé avec succès`);
      } else {
        if (res.status === 401) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          useAppStore.getState().setToken(null);
          useAppStore.getState().setUser(null as any);
          return;
        }
        toast.error(data.message || "Erreur lors de l'upload");
      }
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  }

  // ─── Submit KYC ────────────────────────────────────────────────────

  async function handleSubmitKYC() {
    if (!user?.id || !documentType) {
      toast.error('Sélectionnez un type de document');
      return;
    }
    if (!documentUrl || !selfieUrl) {
      toast.error('Uploadez le document et la selfie');
      return;
    }

    setConfirmDialogOpen(false);
    setSubmitting(true);
    try {
      const token = useAppStore.getState().token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
          documentType,
          documentUrl,
          selfieUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Demande KYC soumise avec succès !');
        setDocumentUrl('');
        setSelfieUrl('');
        fetchKYCStatus();
      } else {
        if (res.status === 401) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          useAppStore.getState().setToken(null);
          useAppStore.getState().setUser(null as any);
          return;
        }
        toast.error(data.message || 'Erreur lors de la soumission');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Status badge ──────────────────────────────────────────────────

  function getKYCStatusDisplay() {
    if (!kyc) return null;

    switch (kyc.status) {
      case 'none':
        return (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
            <Shield className="h-8 w-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Vérification non effectuée
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-500/70">
                Vous devez vérifier votre identité pour effectuer des transferts internationaux
              </p>
            </div>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30">
            <Clock className="h-8 w-8 text-blue-500 shrink-0 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                Vérification en cours
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-500/70">
                {kyc.submittedAt ? `Soumis le ${new Date(kyc.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Votre dossier est en cours de vérification'}
              </p>
            </div>
          </div>
        );
      case 'verified':
        return (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30">
            <ShieldCheck className="h-8 w-8 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Identité vérifiée ✓
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                {kyc.verifiedAt ? `Vérifié le ${new Date(kyc.verifiedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Votre identité a été vérifiée avec succès'}
              </p>
            </div>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
            <ShieldX className="h-8 w-8 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Vérification refusée
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-500/70">
                {kyc.rejectReason || 'Votre dossier n\'a pas pu être vérifié. Veuillez soumettre à nouveau.'}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  // ─── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const isVerified = kyc?.status === 'verified';
  const isPending = kyc?.status === 'pending';
  const canSubmit = !isVerified && !isPending;

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
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              Vérification d'Identité
            </h1>
            <p className="text-xs text-muted-foreground">
              KYC — Sécurité obligatoire
            </p>
          </div>
          <Shield className="h-5 w-5 text-emerald-600" />
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-4">
        {/* KYC Status */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {getKYCStatusDisplay()}
        </motion.div>

        {/* Security Info */}
        {security && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Sécurité de votre compte
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className={`text-lg font-bold ${security.limitReached ? 'text-red-600' : 'text-emerald-600'}`}>
                      {security.dailyTransactions}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Transactions aujourd'hui
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-lg font-bold text-foreground">
                      {security.remainingToday}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Restantes (max {security.dailyLimit})
                    </p>
                  </div>
                </div>
                {security.limitReached && (
                  <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Limite journalière atteinte. Réessayez demain.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* What is KYC */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Qu&apos;est-ce que la vérification KYC ?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                La vérification KYC (Know Your Customer) est obligatoire pour les transferts internationaux.
                Elle nous permet de vérifier votre identité et de protéger votre compte contre la fraude.
              </p>
              <div className="space-y-2">
                {[
                  { icon: User, text: 'Vérification de l\'identité utilisateur' },
                  { icon: Phone, text: 'Confirmation du numéro de téléphone' },
                  { icon: Mail, text: 'Validation de l\'adresse email' },
                  { icon: IdCard, text: 'Document d\'identité officiel' },
                  { icon: Camera, text: 'Photo selfie de vérification' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <p className="text-xs text-muted-foreground">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* KYC Form (only if not verified and not pending) */}
        {canSubmit && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="border-border">
              <CardContent className="p-4 space-y-4">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Soumettre votre vérification
                </p>

                {/* Document type */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Type de document d&apos;identité *</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="h-10 rounded-xl text-sm">
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id_card">Carte d&apos;identité nationale</SelectItem>
                      <SelectItem value="passport">Passeport</SelectItem>
                      <SelectItem value="driver_license">Permis de conduire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Document upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Document d&apos;identité *</Label>
                  <label className="flex items-center justify-center gap-3 h-32 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-emerald-400/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer transition-all">
                    {documentUrl ? (
                      <div className="text-center">
                        <Check className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                        <p className="text-xs text-emerald-600 font-medium">Document uploadé</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        {documentUploading ? (
                          <Loader2 className="h-6 w-6 text-muted-foreground mx-auto mb-1 animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        )}
                        <p className="text-xs text-muted-foreground">
                          {documentUploading ? 'Upload en cours...' : 'Cliquez pour uploader'}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">JPG, PNG, WebP — Max 5 MB</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'document');
                      }}
                      disabled={documentUploading}
                    />
                  </label>
                </div>

                {/* Selfie upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Photo selfie *</Label>
                  <label className="flex items-center justify-center gap-3 h-32 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-emerald-400/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer transition-all">
                    {selfieUrl ? (
                      <div className="text-center">
                        <Check className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                        <p className="text-xs text-emerald-600 font-medium">Selfie uploadée</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        {selfieUploading ? (
                          <Loader2 className="h-6 w-6 text-muted-foreground mx-auto mb-1 animate-spin" />
                        ) : (
                          <Camera className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        )}
                        <p className="text-xs text-muted-foreground">
                          {selfieUploading ? 'Upload en cours...' : 'Prenez ou uploadez une photo'}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">JPG, PNG, WebP — Max 5 MB</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="user"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'selfie');
                      }}
                      disabled={selfieUploading}
                    />
                  </label>
                </div>

                <Separator />

                {/* Security notice */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                  <Lock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Sécurité de vos données</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                      Vos documents sont chiffrés et stockés de manière sécurisée. Ils ne sont jamais partagés publiquement et sont consultables uniquement par l&apos;administration TRAIT.
                    </p>
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                  onClick={() => setConfirmDialogOpen(true)}
                  disabled={!documentType || !documentUrl || !selfieUrl || submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Soumettre la vérification
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Verified section - link to transfer */}
        {isVerified && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
              onClick={() => navigateTo('international-transfer')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Effectuer un transfert international
            </Button>
          </motion.div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Confirmer la soumission
            </DialogTitle>
            <DialogDescription>
              Vérifiez que vos informations sont correctes avant de soumettre.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Type de document</span>
              <span className="font-medium capitalize">
                {documentType === 'id_card' ? 'Carte d\'identité' : documentType === 'passport' ? 'Passeport' : 'Permis de conduire'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Document</span>
              <span className="font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5 inline mr-1" /> Uploadé
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Selfie</span>
              <span className="font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5 inline mr-1" /> Uploadée
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmitKYC}
            >
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
