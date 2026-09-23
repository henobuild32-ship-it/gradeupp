'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Copy, Share2, Link, ExternalLink, Check,
  Loader2, X, DollarSign, Globe, Calendar, Hash, Trash2,
  BarChart3, TrendingUp, Zap, QrCode, ChevronDown, ChevronUp,
  CheckSquare, Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { QRCodeSVG } from 'qrcode.react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Operators catalogue (extensible) ──────────────────────────────────────
const OPERATORS = [
  { id: 'wallet',    label: 'Wallet TRAIT',  logo: '💳', color: 'text-[#0D5C63]' },
  { id: 'mpesa',     label: 'M-Pesa',         logo: '📱', color: 'text-emerald-600' },
  { id: 'orange',    label: 'Orange Money',   logo: '🟠', color: 'text-orange-600' },
  { id: 'airtel',    label: 'Airtel Money',   logo: '📶', color: 'text-red-600' },
  { id: 'afrimoney', label: 'Afrimoney',      logo: '🏦', color: 'text-purple-600' },
] as const;

interface PaymentLink {
  id: string;
  code: string;
  amount: number;
  currency: string;
  description: string;
  status: 'active' | 'expired' | 'max_uses';
  useCount: number;
  maxUses: number | null;
  expiresAt: string | null;
  createdAt: string;
  allowedMethods: string;
}

interface Stats {
  totalLinks: number;
  activeLinks: number;
  totalUses: number;
  totalCollected: number;
}

const statusConfig = {
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' },
  expired: { label: 'Expiré', color: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400' },
  max_uses: { label: 'Max atteint', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' },
};

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://trait-rho.vercel.app';

export default function PaymentLinksScreen() {
  const { user, navigateTo } = useAppStore();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<PaymentLink | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Create form
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('FC');
  const [formDescription, setFormDescription] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formMethods, setFormMethods] = useState<string[]>(['wallet', 'mpesa', 'orange', 'airtel', 'afrimoney']);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.id) fetchLinks();
    else setLoading(false);
  }, [user?.id]);

  async function fetchLinks() {
    try {
      const res = await fetch('/api/payments/links', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setLinks(data.links ?? []);
        setStats(data.stats ?? null);
      }
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }

  function toggleMethod(id: string) {
    setFormMethods(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!formAmount || parseFloat(formAmount) <= 0) {
      toast.error('Veuillez entrer un montant valide'); return;
    }
    if (!formDescription.trim()) {
      toast.error('Veuillez entrer une description'); return;
    }
    if (formMethods.length === 0) {
      toast.error('Sélectionnez au moins un mode de paiement'); return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/payments/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(formAmount),
          currency: formCurrency,
          description: formDescription,
          maxUses: formMaxUses ? parseInt(formMaxUses) : null,
          expiresAt: formExpiry || null,
          allowedMethods: formMethods,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('✅ Lien créé avec succès !');
        setShowCreate(false);
        setFormAmount(''); setFormCurrency('FC'); setFormDescription('');
        setFormMaxUses(''); setFormExpiry('');
        setFormMethods(['wallet', 'mpesa', 'orange', 'airtel', 'afrimoney']);
        fetchLinks();
      } else {
        toast.error(data.message || 'Erreur lors de la création');
      }
    } catch { toast.error('Erreur de connexion'); }
    finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/payments/links?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setLinks(prev => prev.filter(l => l.id !== id));
        toast.success('Lien supprimé');
      } else {
        toast.error(data.message || 'Erreur lors de la suppression');
      }
    } catch { toast.error('Erreur de connexion'); }
    finally { setDeleteTarget(null); }
  }

  function getShareUrl(code: string) {
    return `${BASE_URL}/pay/link/${code}`;
  }

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(getShareUrl(code));
      setCopiedId(code);
      toast.success('URL copiée !');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { toast.error('Erreur de copie'); }
  }

  async function handleShare(link: PaymentLink) {
    const url = getShareUrl(link.code);
    const text = `💳 Payez-moi ${link.currency === 'FC' ? `${link.amount.toLocaleString('fr-FR')} FC` : `$${link.amount.toFixed(2)}`} via TRAIT: ${url}`;
    try {
      await navigator.share({ title: 'Lien de paiement TRAIT', text, url });
    } catch {
      handleCopy(link.code);
    }
  }

  const fmt = (amount: number, currency: string) =>
    currency === 'FC'
      ? `${amount.toLocaleString('fr-FR')} FC`
      : `$${amount.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Liens de paiement</h1>
        </div>
        <Button
          size="sm"
          className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl h-9"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Créer
        </Button>
      </div>

      <div className="px-4 space-y-4">
        {/* Stats dashboard */}
        {stats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 gap-2.5">
              <Card className="border-border">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <BarChart3 className="h-4 w-4 text-[#0D5C63]" />
                    <span className="text-xs text-muted-foreground font-medium">Total collecté</span>
                  </div>
                  <p className="text-lg font-extrabold text-foreground">
                    ${stats.totalCollected.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground font-medium">Liens actifs</span>
                  </div>
                  <p className="text-lg font-extrabold text-foreground">{stats.activeLinks}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground font-medium">Total paiements</span>
                  </div>
                  <p className="text-lg font-extrabold text-foreground">{stats.totalUses}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Link className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground font-medium">Total liens</span>
                  </div>
                  <p className="text-lg font-extrabold text-foreground">{stats.totalLinks}</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Links list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : links.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Link className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground mb-1">Aucun lien de paiement</p>
                <p className="text-sm text-muted-foreground">Créez votre premier lien pour commencer à collecter des paiements</p>
              </div>
              <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" /> Créer un lien
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {links.map((link, idx) => {
              const methods = link.allowedMethods?.split(',') || [];
              const methodIcons = OPERATORS.filter(o => methods.includes(o.id));
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className="border-border hover:border-[#0D5C63]/20 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-lg font-bold text-foreground leading-tight">
                            {fmt(link.amount, link.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
                        </div>
                        <Badge className={`${statusConfig[link.status]?.color || ''} border text-[10px] font-semibold shrink-0`}>
                          {statusConfig[link.status]?.label || link.status}
                        </Badge>
                      </div>

                      {/* URL bar */}
                      <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-xl border border-border/50">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-[11px] font-mono text-muted-foreground truncate flex-1">
                          pay/link/{link.code}
                        </span>
                      </div>

                      {/* Operators */}
                      {methodIcons.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {methodIcons.map(op => (
                            <span key={op.id} title={op.label} className="text-base">{op.logo}</span>
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-1">{methodIcons.length} méthode{methodIcons.length > 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {/* Stats row */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {link.useCount} utilisation{link.useCount !== 1 ? 's' : ''}
                          {link.maxUses ? ` / ${link.maxUses} max` : ''}
                        </span>
                        {link.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expire {new Date(link.expiresAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl" onClick={() => handleCopy(link.code)}>
                          {copiedId === link.code ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                          {copiedId === link.code ? 'Copié' : 'Copier'}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl" onClick={() => handleShare(link)}>
                          <Share2 className="h-3.5 w-3.5 mr-1" /> Partager
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 w-9 rounded-xl" onClick={() => setQrLink(link)}>
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleteTarget(link.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Dialog */}
      <Dialog open={!!qrLink} onOpenChange={() => setQrLink(null)}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>QR Code de paiement</DialogTitle>
            <DialogDescription>Scannez ce code pour payer directement</DialogDescription>
          </DialogHeader>
          {qrLink && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-2xl shadow-lg border">
                <QRCodeSVG value={getShareUrl(qrLink.code)} size={200} level="H" />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg text-foreground">{fmt(qrLink.amount, qrLink.currency)}</p>
                <p className="text-sm text-muted-foreground">{qrLink.description}</p>
              </div>
              <Button variant="outline" className="w-full rounded-xl" onClick={() => handleCopy(qrLink.code)}>
                <Copy className="h-4 w-4 mr-2" /> Copier le lien
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="mx-4 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lien ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Le lien ne sera plus accessible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 rounded-xl" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="mx-4 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau lien de paiement</DialogTitle>
            <DialogDescription>Créez un lien pour recevoir des paiements</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Montant *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" min="0" placeholder="0.00" value={formAmount}
                    onChange={e => setFormAmount(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Devise</Label>
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="FC">Franc Congolais (FC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input placeholder="Ex: Paiement facture" value={formDescription}
                onChange={e => setFormDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max utilisations <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input type="number" min="0" placeholder="Illimité" value={formMaxUses}
                  onChange={e => setFormMaxUses(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Date d'expiration <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input type="date" value={formExpiry}
                  onChange={e => setFormExpiry(e.target.value)} />
              </div>
            </div>

            {/* Operators */}
            <div className="space-y-2">
              <Label>Modes de paiement acceptés</Label>
              <div className="space-y-2">
                {OPERATORS.map(op => {
                  const active = formMethods.includes(op.id);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => toggleMethod(op.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        active ? 'border-[#0D5C63]/40 bg-[#0D5C63]/5' : 'border-border bg-card'
                      }`}
                    >
                      {active
                        ? <CheckSquare className="h-4 w-4 text-[#0D5C63] shrink-0" />
                        : <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                      }
                      <span className="text-base">{op.logo}</span>
                      <span className={`text-sm font-semibold ${active ? op.color : 'text-foreground'}`}>{op.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
