'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Loader2,
  UserCheck,
  UserX,
  Phone,
  Wallet,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface FoundUser {
  id: string;
  name: string;
  phone: string;
  pseudo: string;
  role: string;
  bonusBalance: number;
  bonusBalanceFC: number;
  realBalance: number;
  realBalanceFC: number;
  suspended: boolean;
}

export default function AdminBonusAdjustScreen() {
  const { admin, goBack } = useAppStore();
  const [searchPhone, setSearchPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);

  const [bonusAmount, setBonusAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [reason, setReason] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const phone = searchPhone.trim();
    if (!phone) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }

    setSearching(true);
    setFoundUser(null);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(phone)}&limit=1`);
      const data = await res.json();

      if (data.success && data.users && data.users.length > 0) {
        const u = data.users[0];
        setFoundUser({
          id: u.id,
          name: u.name,
          phone: u.phone,
          pseudo: u.pseudo,
          role: u.role,
          bonusBalance: u.bonusBalance,
          bonusBalanceFC: u.bonusBalanceFC,
          realBalance: u.realBalance,
          realBalanceFC: u.realBalanceFC,
          suspended: u.suspended,
        });
      } else {
        toast.error('Aucun utilisateur trouvé avec ce numéro');
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  }

  function getDisplayAmount(): string {
    const num = parseFloat(bonusAmount);
    if (isNaN(num)) return '0';
    return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function isAddMode(): boolean {
    const num = parseFloat(bonusAmount);
    return !isNaN(num) && num > 0;
  }

  function handleOpenConfirm() {
    if (!foundUser) {
      toast.error('Veuillez d\'abord rechercher un utilisateur');
      return;
    }
    const num = parseFloat(bonusAmount);
    if (isNaN(num) || num === 0) {
      toast.error('Veuillez entrer un montant valide (différent de 0)');
      return;
    }
    if (!reason.trim()) {
      toast.error('Veuillez entrer une raison');
      return;
    }
    setConfirmOpen(true);
  }

  async function handleSubmit() {
    if (!foundUser || !admin?.id) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/bonus/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: foundUser.id,
          adminId: admin.id,
          amount: parseFloat(bonusAmount),
          currency,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          isAddMode()
            ? `Bonus de ${currency === 'USD' ? '$' : ''}${getDisplayAmount()} ${currency} ajouté à ${foundUser.name}`
            : `Bonus de ${currency === 'USD' ? '$' : ''}${getDisplayAmount()} ${currency} retiré de ${foundUser.name}`
        );
        setConfirmOpen(false);
        // Reset form
        setBonusAmount('');
        setReason('');
        setSearchPhone('');
        setFoundUser(null);
      } else {
        toast.error(data.error || 'Échec de l\'ajustement du bonus');
      }
    } catch (err) {
      console.error('Bonus adjust error:', err);
      toast.error('Erreur lors de l\'ajustement');
    } finally {
      setSubmitting(false);
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
              Ajuster le Bonus
            </h1>
            <p className="text-xs text-muted-foreground">
              Ajouter ou retirer le bonus d&apos;un utilisateur
            </p>
          </div>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-4">
        {/* Search User */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
        >
          <Label className="text-sm font-medium mb-2 block">
            Rechercher un utilisateur
          </Label>
          <form onSubmit={handleSearch}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Numéro de téléphone..."
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="pl-9 pr-4 bg-muted/50"
                />
              </div>
              <Button
                type="submit"
                disabled={searching}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </motion.div>

        {/* User Info Card */}
        {foundUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' as const }}
          >
            <Card className={`border-border ${foundUser.suspended ? 'border-red-200 dark:border-red-800/40' : 'border-emerald-200 dark:border-emerald-800/40'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    foundUser.suspended
                      ? 'bg-red-100 dark:bg-red-900/40'
                      : 'bg-emerald-100 dark:bg-emerald-900/40'
                  }`}>
                    {foundUser.suspended ? (
                      <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {foundUser.name}
                      </h3>
                      <Badge className={`text-xs ${
                        foundUser.role === 'agent'
                          ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400'
                      }`}>
                        {foundUser.role === 'agent' ? 'Agent' : 'Client'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{foundUser.phone}</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs text-muted-foreground">Solde Réel</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      ${foundUser.realBalance.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {foundUser.realBalanceFC.toLocaleString('fr-FR')} CDF
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs text-muted-foreground">Solde Bonus</span>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      ${foundUser.bonusBalance.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {foundUser.bonusBalanceFC.toLocaleString('fr-FR')} CDF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Adjustment Form */}
        {foundUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' as const }}
          >
            <Card className="border-border">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Ajustement du Bonus
                </h3>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="bonus-amount" className="text-sm font-medium">
                    Montant
                  </Label>
                  <Input
                    id="bonus-amount"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 500 (positif) ou -200 (négatif)"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)}
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Utilisez un montant positif pour ajouter, négatif pour retirer
                  </p>
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Devise
                  </Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-full bg-muted/50">
                      <SelectValue placeholder="Choisir la devise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - Dollar Américain</SelectItem>
                      <SelectItem value="FC">CDF - Franc congolais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="bonus-reason" className="text-sm font-medium">
                    Raison
                  </Label>
                  <Textarea
                    id="bonus-reason"
                    placeholder="Décrivez la raison de cet ajustement..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="bg-muted/50 resize-none"
                  />
                </div>

                {/* Preview */}
                {bonusAmount && parseFloat(bonusAmount) !== 0 && (
                  <div className={`p-3 rounded-lg ${
                    isAddMode()
                      ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/40'
                      : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800/40'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isAddMode() ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {isAddMode() ? 'Ajout' : 'Retrait'} de bonus
                      </span>
                    </div>
                    <p className={`text-xs text-muted-foreground`}>
                      {isAddMode()
                        ? `${currency === 'USD' ? '$' : ''}${getDisplayAmount()} ${currency} sera ajouté au solde bonus de ${foundUser.name}`
                        : `${currency === 'USD' ? '$' : ''}${getDisplayAmount()} ${currency} sera retiré du solde bonus de ${foundUser.name}`
                      }
                    </p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  onClick={handleOpenConfirm}
                  disabled={!bonusAmount || parseFloat(bonusAmount) === 0 || !reason.trim()}
                >
                  Confirmer l&apos;ajustement
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Empty State when no user */}
        {!foundUser && !searching && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' as const }}
          >
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-base font-medium text-foreground mb-1">
                  Recherchez un utilisateur
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Entrez un numéro de téléphone pour rechercher l&apos;utilisateur et ajuster son bonus
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${isAddMode() ? 'text-emerald-600' : 'text-red-600'}`} />
              Confirmer l&apos;ajustement
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de {isAddMode() ? 'ajouter' : 'retirer'}{' '}
              <strong>{currency === 'USD' ? '$' : ''}{getDisplayAmount()} {currency}</strong> au bonus de{' '}
              <strong>{foundUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilisateur</span>
                <span className="font-medium text-foreground">{foundUser?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Téléphone</span>
                <span className="font-medium text-foreground">{foundUser?.phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant</span>
                <span className={`font-semibold ${isAddMode() ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isAddMode() ? '+' : ''}{currency === 'USD' ? '$' : ''}{getDisplayAmount()} {currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium text-foreground">
                  {isAddMode() ? 'Ajout' : 'Retrait'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Raison</span>
                <span className="font-medium text-foreground text-right max-w-[60%] truncate">{reason}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              className={`font-medium ${
                isAddMode()
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Traitement...
                </>
              ) : isAddMode() ? (
                'Confirmer l\'ajout'
              ) : (
                'Confirmer le retrait'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
