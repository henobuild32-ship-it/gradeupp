'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CreditCard, Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import TraitCard from '@/components/trait/TraitCard';

interface CardData {
  id: string;
  cardType: 'USD' | 'FC';
  cardNumber: string | null;
  qrCode: string;
  expiryDate: string | null;
  holderName?: string | null;
  jobTitle?: string | null;
  birthDate?: string | null;
  holderPhoto?: string | null;
  requestStatus?: string | null;
  status: string;
  createdAt: string;
}

export default function CardPaymentScreen() {
  const { user, navigateTo, setUser } = useAppStore();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'FC'>('USD');
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const currencyBalance =
    selectedCurrency === 'USD'
      ? (user?.realBalance ?? 0)
      : (user?.realBalanceFC ?? 0);

  // Fetch cards on mount
  useEffect(() => {
    async function fetchCards() {
      if (!user?.id) return;
      setLoadingCards(true);
      try {
        const res = await fetch(`/api/cards/my-cards?userId=${user.id}`);
        const data = await res.json();
        if (data.success) {
          const activeCards = (data.cards || []).filter(
            (c: CardData) => c.status === 'active'
          );
          setCards(activeCards);

          // Auto-select first active card
          if (activeCards.length > 0) {
            const firstUsdCard = activeCards.find((c: CardData) => c.cardType === 'USD');
            const firstCard = firstUsdCard || activeCards[0];
            setSelectedCurrency(firstCard.cardType);
            setSelectedCard(firstCard);
          }
        }
      } catch {
        toast.error('Erreur de connexion');
      } finally {
        setLoadingCards(false);
      }
    }
    fetchCards();
  }, [user?.id]);

  // Update selected card when currency tab changes
  useEffect(() => {
    const cardForCurrency = cards.find((c) => c.cardType === selectedCurrency);
    setSelectedCard(cardForCurrency || null);
  }, [selectedCurrency, cards]);

  function formatMaskedNumber(cardNumber: string | null) {
    return cardNumber || '•••• •••• ••••';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !selectedCard || numericAmount <= 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!pin || pin.length < 4 || pin.length > 8) {
      toast.error('Votre code PIN à 4 à 8 chiffres est obligatoire pour valider ce paiement.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cards/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          cardId: selectedCard.id,
          amount: numericAmount,
          currency: selectedCurrency,
          description: description || undefined,
          pin,
        }),
      });
      const data = await res.json();

      if (data.success) {
        // Update user balance in store
        if (data.updatedBalances) {
          setUser({
            ...user,
            realBalance: data.updatedBalances.realBalance,
            realBalanceFC: data.updatedBalances.realBalanceFC,
            bonusBalance: data.updatedBalances.bonusBalance,
            bonusBalanceFC: data.updatedBalances.bonusBalanceFC,
          } as any);
        }
        toast.success('Paiement effectué avec succès !');
        navigateTo('home');
      } else {
        toast.error(data.message || 'Erreur lors du paiement');
      }
    } catch {
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  const isUSD = selectedCurrency === 'USD';
  const accentColor = isUSD ? '#14888F' : '#EF4444';
  const currencySymbol = isUSD ? '$' : '';

  // Loading state
  if (loadingCards) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Chargement de vos cartes...</p>
        </div>
      </div>
    );
  }

  // No cards state
  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigateTo('home')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Paiement par carte</h1>
        </div>

        <div className="flex flex-col items-center justify-center px-6 pt-20">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <CreditCard className="w-8 h-8" style={{ color: accentColor }} />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Aucune carte active
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Vous devez d&apos;abord demander et recevoir une carte avant de pouvoir effectuer des paiements.
          </p>
          <Button
            className="rounded-xl font-semibold"
            onClick={() => navigateTo('card-request')}
          >
            Demander une carte
          </Button>
        </div>
      </div>
    );
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
        <h1 className="text-xl font-bold text-foreground">Paiement par carte</h1>
      </div>

      <div className="px-4 space-y-5 pb-6">
        {/* Card Selector Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Tabs value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v as 'USD' | 'FC')}>
            <TabsList className="w-full h-12">
              <TabsTrigger value="USD" className="flex-1 text-sm font-medium">
                USD - Dollar
              </TabsTrigger>
              <TabsTrigger value="FC" className="flex-1 text-sm font-medium">
                FC - Franc Congolais
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Selected Card Display */}
        <AnimatePresence mode="wait">
          {selectedCard && (
            <motion.div
              key={selectedCard.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <TraitCard
                cardType={selectedCard.cardType}
                cardNumber={selectedCard.cardNumber}
                cardHolder={selectedCard.holderName || user?.name || 'TITULAIRE'}
                expiryDate={selectedCard.expiryDate}
                qrCode={selectedCard.qrCode}
                jobTitle={selectedCard.jobTitle}
                birthDate={selectedCard.birthDate}
                holderPhoto={selectedCard.holderPhoto}
                cardId={selectedCard.id}
                requestStatus={selectedCard.requestStatus}
                balance={currencyBalance}
                status={selectedCard.status}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card masked info */}
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Carte sélectionnée
                    </p>
                    <p className="text-sm font-mono font-semibold tracking-wider">
                      {formatMaskedNumber(selectedCard.cardNumber)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs font-medium"
                    style={{
                      backgroundColor: `${accentColor}15`,
                      color: accentColor,
                    }}
                  >
                    {selectedCard.cardType}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Payment Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
        >
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 space-y-5">
              {/* Balance Info */}
              <div
                className="rounded-xl p-3"
                style={{
                  backgroundColor: `${accentColor}10`,
                  border: `1px solid ${accentColor}25`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: accentColor }}>
                    Solde disponible ({selectedCurrency})
                  </span>
                  <span className="text-sm font-bold" style={{ color: accentColor }}>
                    {currencySymbol}
                    {currencyBalance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    {!isUSD && <span className="text-xs font-medium ml-0.5">FC</span>}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="payAmount" className="text-sm font-medium">
                  Montant
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    {isUSD ? '$' : ''}
                  </span>
                  <Input
                    id="payAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`h-11 ${isUSD ? 'pl-7' : 'pl-3'}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    {selectedCurrency}
                  </span>
                </div>
                {numericAmount > currencyBalance && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Solde insuffisant
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="payDescription" className="text-sm font-medium">
                  Description <span className="text-muted-foreground font-normal">(optionnel)</span>
                </Label>
                <Input
                  id="payDescription"
                  type="text"
                  placeholder="Ex: Achat au marché"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-11"
                />
              </div>

              {/* PIN Code */}
              {(
                <div className="space-y-2">
                  <Label htmlFor="payPin" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Lock className="size-3.5 text-muted-foreground" />
                    Code PIN <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="payPin"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Entrez votre PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="h-11 font-mono tracking-widest text-center text-lg"
                    required
                  />
                </div>
              )}

              {/* Submit */}
              <Button
                className="w-full h-12 text-white font-semibold rounded-xl text-base"
                style={{ backgroundColor: accentColor }}
                onClick={handleSubmit}
                disabled={loading || numericAmount <= 0 || numericAmount > currencyBalance}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Traitement...
                  </span>
                ) : (
                  `Payer ${isUSD ? '$' : ''}${numericAmount.toFixed(2)}${!isUSD ? ' FC' : ''}`
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
