'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

function fmtCur(amount: number, currency: string) {
  if (currency === 'FC') return `${amount.toFixed(2)} FC`;
  return `$${amount.toFixed(2)}`;
}

export default function SendScreen() {
  const { user, navigateTo, setUser, setPendingPinAction, pageParams } = useAppStore();
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Debounced phone lookup
  useEffect(() => {
    if (!receiverPhone || receiverPhone.length < 8) {
      setReceiverName('');
      return;
    }
    const timer = setTimeout(() => {
      setLookingUp(true);
      fetch(`/api/users/phone-lookup?phone=${encodeURIComponent(receiverPhone.trim())}`, {
        headers: user?.id ? { 'Authorization': `Bearer ${localStorage.getItem('trait-token') || ''}` } : {},
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.found && data.user) {
            setReceiverName(data.user.name);
          } else {
            setReceiverName('');
          }
        })
        .catch(() => setReceiverName(''))
        .finally(() => setLookingUp(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [receiverPhone, user?.id]);

  // Handle pay recipient from QR code scan
  useEffect(() => {
    const recipientId = pageParams?.payRecipientId
    if (!recipientId || receiverPhone) return

    setLookingUp(true)
    fetch(`/api/users/public/${recipientId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.user) {
          setReceiverPhone(data.user.phone.replace(/\*/g, '') || data.user.pseudo || '')
          setReceiverName(data.user.name)
          toast.success(`Paiement vers ${data.user.name}`)
        }
      })
      .catch(() => {})
      .finally(() => setLookingUp(false))
  }, [pageParams?.payRecipientId])

  const isFC = currency === 'FC';
  const numericAmount = parseFloat(amount) || 0;
  const fee = Math.round(numericAmount * 0.007 * 100) / 100;
  const total = numericAmount + fee;

  const availableBalance = isFC
    ? (user?.realBalanceFC ?? 0) + (user?.bonusBalanceFC ?? 0)
    : (user?.realBalance ?? 0) + (user?.bonusBalance ?? 0);

  const curSymbol = isFC ? 'FC' : '$';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receiverPhone.trim()) {
      toast.error('Veuillez entrer le numéro du destinataire');
      return;
    }
    if (numericAmount <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    if (total > availableBalance) {
      toast.error(`Solde insuffisant en ${isFC ? 'FC' : 'USD'}. Disponible: ${fmtCur(availableBalance, currency)}`);
      return;
    }
    setShowConfirm(true);
  }

  function requestPinAndSend() {
    if (!user?.id) return;
    setShowConfirm(false);

    setPendingPinAction(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/transfer/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: user.id,
            receiverPhone: receiverPhone.trim(),
            amount: numericAmount,
            currency,
          }),
        });
        const data = await res.json();
        if (data.success) {
          // Update local user state with new balances from server
          if (data.updatedBalances) {
            setUser({
              ...user,
              realBalance: data.updatedBalances.realBalance,
              realBalanceFC: data.updatedBalances.realBalanceFC,
              bonusBalance: data.updatedBalances.bonusBalance,
              bonusBalanceFC: data.updatedBalances.bonusBalanceFC,
            } as any);
          }
          toast.success('Transfert envoyé avec succès !');
          setReceiverPhone('');
          setAmount('');
          setNote('');
          navigateTo('home');
        } else {
          toast.error(data.message || 'Erreur lors du transfert');
        }
      } catch {
        toast.error('Erreur de connexion. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    });

    navigateTo('pin-verify');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => navigateTo('home')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Envoyer de l&apos;argent</h1>
      </div>

      {/* Balance Info */}
      <div className="px-4 mb-4">
        <Card className="border-border bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <p className="text-sm text-emerald-600 mb-1">
              Solde disponible ({isFC ? 'FC' : 'USD'})
            </p>
            <p className="text-2xl font-bold text-emerald-700">
              {fmtCur(availableBalance, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PIN info */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3" />
          <span>Code PIN requis pour confirmer</span>
        </div>
      </div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="px-4"
      >
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 space-y-5">
            {/* Currency - first so user picks before entering amount */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - Dollar US</SelectItem>
                  <SelectItem value="FC">FC - Franc Congolais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Receiver Phone */}
            <div className="space-y-2">
              <Label htmlFor="receiver" className="text-sm font-medium">
                Numéro du destinataire
              </Label>
              <div className="relative">
                <Input
                  id="receiver"
                  type="tel"
                  placeholder="+243 000 000 000"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="h-11"
                />
                {lookingUp && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0D5C63]" />
                  </div>
                )}
              </div>
              {receiverPhone.length >= 8 && !lookingUp && (
                receiverName ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                    <User className="h-3.5 w-3.5" />
                    <span>{receiverName}</span>
                    <span className="text-xs text-muted-foreground font-normal">— compte TRAIT trouvé</span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Nouveau compte sera créé automatiquement
                  </div>
                )
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Montant
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  {isFC ? '' : '$'}
                </span>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`h-11 ${isFC ? 'pl-3' : 'pl-7'}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  {currency}
                </span>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm font-medium">
                Note <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Input
                id="note"
                type="text"
                placeholder="Ajouter une note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Fee & Total */}
            {numericAmount > 0 && (
              <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frais ({0.7}%)</span>
                  <span className="font-medium">{fmtCur(fee, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">{fmtCur(total, currency)}</span>
                </div>
                {total > availableBalance && (
                  <p className="text-xs text-red-500 mt-1">Solde insuffisant</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-base"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Envoi en cours...
                </span>
              ) : 'Envoyer'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirmer le transfert</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d&apos;envoyer de l&apos;argent.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted/50 p-4 space-y-2 my-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Destinataire</span>
              <span className="font-medium">{receiverPhone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-medium">{fmtCur(numericAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frais</span>
              <span className="font-medium">{fmtCur(fee, currency)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm">
              <span className="font-medium">Total</span>
              <span className="font-bold text-emerald-600">{fmtCur(total, currency)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="size-3" />
            Votre code PIN sera demandé pour confirmer
          </p>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowConfirm(false)}>
              Annuler
            </Button>
            <Button
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={requestPinAndSend}
              disabled={loading}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
