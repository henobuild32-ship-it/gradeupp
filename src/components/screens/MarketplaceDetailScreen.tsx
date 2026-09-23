'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Package,
  Palette,
  LayoutTemplate,
  Wrench,
  MonitorSmartphone,
  Info,
  ShoppingCart,
  CheckCircle2,
  Loader2,
  User,
  Gift,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';

const CATEGORY_ICONS: Record<string, typeof Package> = {
  design: Palette,
  template: LayoutTemplate,
  service: Wrench,
  digital_product: MonitorSmartphone,
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  design: 'from-rose-400 to-orange-400',
  template: 'from-violet-400 to-purple-400',
  service: 'from-amber-400 to-yellow-400',
  digital_product: 'from-emerald-400 to-teal-400',
  default: 'from-emerald-400 to-cyan-400',
};

interface ProductBonus {
  enabled: boolean;
  only: boolean;
  bonusPrice: number | null;
  maxQty: number | null;
  expiryAt: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  imageUrl: string | null;
  active: boolean;
  stock?: number;
  condition?: string;
  qrCode?: string | null;
  createdAt: string;
  seller: { id: string; name: string; pseudo: string } | null;
  bonus: ProductBonus;
}

interface PurchaseResult {
  id: string;
  amount: number;
  usedBonus: number;
  usedReal: number;
  status: string;
}

export default function MarketplaceDetailScreen() {
  const { goBack, pageParams, user, setUser } = useAppStore();
  const productId = pageParams.productId as string | undefined;
  const productQr = pageParams.productQr as string | undefined;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [paymentMode, setPaymentMode] = useState<'bonus' | 'real'>('real');

  useEffect(() => {
    if (!productId && !productQr) {
      goBack();
      return;
    }

    async function fetchProduct() {
      try {
        // Prefer QR lookup when scanned
        if (productQr && !productId) {
          const res = await fetch(`/api/products/qr?code=${encodeURIComponent(productQr)}`, {
            credentials: 'include',
          });
          const data = await res.json();
          if (data.success && data.product) {
            const p = data.product;
            setProduct({
              ...p,
              bonus: {
                enabled: false,
                only: false,
                bonusPrice: null,
                maxQty: null,
                expiryAt: null,
              },
            } as Product);
          } else {
            toast.error(data.message || 'Produit introuvable');
            goBack();
          }
          return;
        }

        const res = await fetch('/api/marketplace/products');
        const data = await res.json();
        if (data.success) {
          const found = data.products.find(
            (p: Product) => p.id === productId
          );
          if (found) {
            setProduct(found);
            // Auto-select bonus mode if product is bonus-only
            if (found.bonus.only) {
              setPaymentMode('bonus');
            }
          } else {
            toast.error('Produit introuvable');
            goBack();
          }
        }
      } catch {
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [productId, productQr, goBack]);

  const isBonusProduct = product?.bonus.enabled || product?.bonus.only;
  const isBonusOnly = product?.bonus.only;
  const isExpired = product?.bonus.expiryAt && new Date(product.bonus.expiryAt) < new Date();
  const displayPrice = isBonusProduct && product?.bonus.bonusPrice && paymentMode === 'bonus'
    ? product.bonus.bonusPrice!
    : product?.price ?? 0;
  const currency = product?.currency ?? 'USD';

  const bonusBalance = currency === 'FC' ? (user?.bonusBalanceFC ?? 0) : (user?.bonusBalance ?? 0);
  const realBalance = currency === 'FC' ? (user?.realBalanceFC ?? 0) : (user?.realBalance ?? 0);
  const hasSufficientBonus = bonusBalance >= displayPrice;
  const hasSufficientReal = realBalance >= displayPrice;

  const handlePurchase = async () => {
    if (!product || !user) return;

    setPurchasing(true);
    try {
      const res = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          buyerId: user.id,
          useBonus: paymentMode === 'bonus',
          useReal: paymentMode === 'real',
        }),
      });
      const data = await res.json();

      if (data.success) {
        setPurchaseResult(data.purchase);
        setShowSuccess(true);

        // Fetch fresh user data from server (real-time balance update)
        try {
          const profileRes = await fetch(`/api/auth/profile?userId=${user.id}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.success && profileData.user) {
              setUser({
                ...user,
                realBalance: profileData.user.realBalance,
                realBalanceFC: profileData.user.realBalanceFC,
                bonusBalance: profileData.user.bonusBalance,
                bonusBalanceFC: profileData.user.bonusBalanceFC,
              } as any);
            }
          }
        } catch {
          // Fallback: use local calculation
          const updatedUser = { ...user };
          if ((data.purchase?.usedBonus ?? 0) > 0) {
            if (currency === 'FC') {
              updatedUser.bonusBalanceFC = Math.max(0, (updatedUser.bonusBalanceFC ?? 0) - (data.purchase?.usedBonus ?? 0));
            } else {
              updatedUser.bonusBalance = Math.max(0, (updatedUser.bonusBalance ?? 0) - (data.purchase?.usedBonus ?? 0));
            }
          }
          if ((data.purchase?.usedReal ?? 0) > 0) {
            if (currency === 'FC') {
              updatedUser.realBalanceFC = Math.max(0, (updatedUser.realBalanceFC ?? 0) - (data.purchase?.usedReal ?? 0));
            } else {
              updatedUser.realBalance = Math.max(0, (updatedUser.realBalance ?? 0) - (data.purchase?.usedReal ?? 0));
            }
          }
          setUser(updatedUser as any);
        }
      } else {
        toast.error(data.message || "Erreur lors de l'achat");
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setPurchasing(false);
    }
  };

  const Icon = product
    ? (CATEGORY_ICONS[product.category] || Package)
    : Package;
  const gradient = product
    ? CATEGORY_GRADIENTS[product.category] || CATEGORY_GRADIENTS.default
    : CATEGORY_GRADIENTS.default;

  const formatPrice = (price: number, cur: string) => {
    if (cur === 'FC') {
      return `${price.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC`;
    }
    return `$${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="text-lg font-semibold">Détails du produit</h1>
          </div>
        </header>
        <div className="flex-1 px-4 py-4 space-y-4">
          <Skeleton className="w-full aspect-[4/3] rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-semibold">Détails du produit</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-8">
        {/* Product image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`w-full aspect-[4/3] bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center relative`}
        >
          <Icon className="size-20 text-white/80" />

          {/* Bonus badge on image */}
          {isBonusProduct && !isExpired && (
            <Badge className="absolute top-3 left-3 bg-amber-400 text-amber-900 border-0 text-xs font-bold shadow-md px-2.5 py-1">
              <Gift className="size-4 mr-1" />
              {isBonusOnly ? 'Bonus Exclusif' : 'Compatible Bonus'}
            </Badge>
          )}
        </motion.div>

        {/* Product info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold leading-tight">{product.name}</h2>
            <Badge className="bg-emerald-100 text-emerald-700 border-0 shrink-0">
              {product.category}
            </Badge>
          </div>

          {/* Stock & condition */}
          <div className="flex flex-wrap items-center gap-2">
            {product.stock !== undefined && (
              <Badge
                variant="outline"
                className={
                  product.stock <= 0
                    ? 'text-red-600 border-red-200 bg-red-50'
                    : product.stock <= 3
                      ? 'text-amber-600 border-amber-200 bg-amber-50'
                      : 'text-emerald-600 border-emerald-200 bg-emerald-50'
                }
              >
                {product.stock <= 0 ? 'Rupture de stock' : `Stock: ${product.stock}`}
              </Badge>
            )}
            {product.condition && (
              <Badge variant="outline" className="text-muted-foreground">
                {product.condition === 'used' ? 'Occasion' : product.condition === 'refurbished' ? 'Reconditionné' : 'Neuf'}
              </Badge>
            )}
          </div>

          {/* Price display */}
          <div className="flex items-baseline gap-3">
            <p className="text-2xl font-bold text-emerald-600">
              {formatPrice(displayPrice, currency)}
            </p>
            {isBonusProduct && product.bonus.bonusPrice && paymentMode === 'bonus' && (
              <p className="text-muted-foreground text-base line-through">
                {formatPrice(product.price, currency)}
              </p>
            )}
            {currency === 'FC' && (
              <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">FC</Badge>
            )}
          </div>

          <p className="text-muted-foreground leading-relaxed">
            {product.description}
          </p>
        </motion.div>

        {/* Seller info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <User className="size-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {product.seller?.name || product.seller?.pseudo || 'Anonyme'}
            </p>
            <p className="text-xs text-muted-foreground">Service</p>
          </div>
        </motion.div>

        {/* Payment Mode Selection (only if bonus is enabled) */}
        {isBonusProduct && !isExpired && !isBonusOnly && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <p className="text-sm font-medium">Mode de paiement</p>
            <div className="grid grid-cols-2 gap-2">
              {/* Real money option */}
              <button
                onClick={() => setPaymentMode('real')}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  paymentMode === 'real'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-border hover:border-emerald-200'
                }`}
              >
                <Wallet className={`size-5 mx-auto mb-1 ${paymentMode === 'real' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium">Argent réel</p>
                <p className="text-sm font-bold text-emerald-600">
                  {formatPrice(product.price, currency)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Solde: {formatPrice(realBalance, currency)}
                </p>
              </button>

              {/* Bonus option */}
              <button
                onClick={() => setPaymentMode('bonus')}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  paymentMode === 'bonus'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-border hover:border-amber-200'
                }`}
              >
                <Gift className={`size-5 mx-auto mb-1 ${paymentMode === 'bonus' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium">Bonus</p>
                <p className="text-sm font-bold text-amber-600">
                  {formatPrice(product.bonus.bonusPrice ?? product.price, currency)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Bonus: {formatPrice(bonusBalance, currency)}
                </p>
              </button>
            </div>
          </motion.div>
        )}

        {/* Bonus-only notice */}
        {isBonusOnly && !isExpired && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800"
          >
            <Gift className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Produit bonus exclusif</p>
              <p className="text-xs mt-0.5">
                Ce produit ne peut être acheté qu&apos;avec votre solde bonus.
                {!hasSufficientBonus && ' Solde bonus insuffisant.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Bonus expired notice */}
        {isBonusProduct && isExpired && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800"
          >
            <XCircle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Bonus expiré</p>
              <p className="text-xs mt-0.5">
                La période de bonus pour ce produit est terminée. Vous pouvez l&apos;acheter avec votre solde réel.
              </p>
            </div>
          </motion.div>
        )}

        {/* Balance info notice */}
        {isBonusProduct && !isExpired && !isBonusOnly && paymentMode === 'bonus' && !hasSufficientBonus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-800"
          >
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Solde bonus insuffisant</p>
              <p className="text-xs mt-0.5">
                Votre bonus ({formatPrice(bonusBalance, currency)}) ne couvre pas ce produit ({formatPrice(displayPrice, currency)}).
                {hasSufficientReal && ' Utilisez votre argent réel à la place.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Security info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800"
        >
          <ShieldCheck className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Paiement sécurisé</p>
            <p className="text-xs mt-0.5">
              {paymentMode === 'bonus'
                ? "Le bonus est un crédit promotionnel TRAIT. Il ne peut ni être retiré ni transféré."
                : "Votre achat est protégé par le système de sécurité TRAIT."}
            </p>
          </div>
        </motion.div>

        {/* Purchase button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-2 space-y-2"
        >
          <Button
            size="lg"
            className={`w-full text-white h-12 text-base ${
              isBonusOnly
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            onClick={handlePurchase}
            disabled={
              purchasing ||
              (product.stock !== undefined && product.stock <= 0) ||
              (paymentMode === 'bonus' && !hasSufficientBonus) ||
              (paymentMode === 'real' && !hasSufficientReal)
            }
          >
            {purchasing ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Traitement en cours...
              </>
            ) : product.stock !== undefined && product.stock <= 0 ? (
              <>
                <XCircle className="size-5" />
                Rupture de stock
              </>
            ) : isBonusOnly || paymentMode === 'bonus' ? (
              <>
                <Gift className="size-5" />
                Acheter avec bonus — {formatPrice(displayPrice, currency)}
              </>
            ) : (
              <>
                <ShoppingCart className="size-5" />
                Acheter — {formatPrice(product.price, currency)}
              </>
            )}
          </Button>

          {/* Insufficient balance hint */}
          {paymentMode === 'bonus' && !hasSufficientBonus && (
            <p className="text-xs text-center text-muted-foreground">
              Solde bonus: {formatPrice(bonusBalance, currency)} — Solde réel: {formatPrice(realBalance, currency)}
            </p>
          )}
          {paymentMode === 'real' && !hasSufficientReal && (
            <p className="text-xs text-center text-muted-foreground">
              Solde insuffisant. Faites un dépôt pour continuer.
            </p>
          )}
        </motion.div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-center">Achat réussi !</DialogTitle>
            <DialogDescription className="text-center">
              Votre achat a été effectué avec succès.
            </DialogDescription>
          </DialogHeader>

          {purchaseResult && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">
                  {formatPrice(purchaseResult.amount, currency)}
                </span>
              </div>
              {purchaseResult.usedBonus > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Solde bonus utilisé</span>
                  <span className="font-medium text-amber-600">
                    -{formatPrice(purchaseResult.usedBonus, currency)}
                  </span>
                </div>
              )}
              {purchaseResult.usedReal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Solde réel utilisé</span>
                  <span className="font-medium">
                    -{formatPrice(purchaseResult.usedReal, currency)}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Nouveau solde bonus</span>
                <span className="font-medium text-emerald-600">
                  {formatPrice(
                    bonusBalance - purchaseResult.usedBonus,
                    currency
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nouveau solde réel</span>
                <span className="font-medium">
                  {formatPrice(
                    realBalance - purchaseResult.usedReal,
                    currency
                  )}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setShowSuccess(false);
                goBack();
              }}
            >
              Retour au Marketplace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
