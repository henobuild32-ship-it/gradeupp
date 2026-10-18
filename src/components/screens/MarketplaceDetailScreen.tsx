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
  ShoppingCart,
  CheckCircle2,
  Loader2,
  User,
  Gift,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  XCircle,
  Phone,
  MapPin,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Lock,
  Minus,
  Plus,
  ReceiptText,
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
import {
  formatMarketPrice,
  parseImages,
  parsePaymentMethods,
  paymentMethodLabel,
} from '@/lib/marketplace';

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
  images?: string | null;
  paymentMethods?: string | null;
  sellerPhone?: string | null;
  sellerAddress?: string | null;
  active: boolean;
  stock?: number;
  condition?: string;
  qrCode?: string | null;
  createdAt: string;
  seller: { id: string; name: string; pseudo: string; phone?: string } | null;
  bonus: ProductBonus;
}

interface PurchaseResult {
  id: string;
  amount: number;
  quantity: number;
  usedBonus: number;
  usedReal: number;
  status: string;
}

export default function MarketplaceDetailScreen() {
  const { goBack, pageParams, user, setUser, setPendingPinAction, navigateTo } = useAppStore();
  const productId = pageParams.productId as string | undefined;
  const productQr = pageParams.productQr as string | undefined;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [paymentMode, setPaymentMode] = useState<'bonus' | 'real'>('real');
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);

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
              bonus: p.bonus || {
                enabled: false,
                only: false,
                bonusPrice: null,
                maxQty: null,
                expiryAt: null,
              },
            } as Product);
          } else {
            toast.error(data.message || 'QR invalide ou produit introuvable');
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
  const unitPrice = isBonusProduct && product?.bonus.bonusPrice && paymentMode === 'bonus'
    ? product.bonus.bonusPrice!
    : product?.price ?? 0;
  const displayPrice = unitPrice * qty;
  const currency = product?.currency ?? 'USD';
  const maxStock = product?.stock ?? 1;

  const gallery = product
    ? (() => {
        const imgs = parseImages(product.images);
        if (imgs.length > 0) return imgs;
        return product.imageUrl ? [product.imageUrl] : [];
      })()
    : [];
  const paymentMethodKeys = product ? parsePaymentMethods(product.paymentMethods) : [];

  const bonusBalance = currency === 'FC' ? (user?.bonusBalanceFC ?? 0) : (user?.bonusBalance ?? 0);
  const realBalance = currency === 'FC' ? (user?.realBalanceFC ?? 0) : (user?.realBalance ?? 0);
  const hasSufficientBonus = bonusBalance >= displayPrice;
  const hasSufficientReal = realBalance >= displayPrice;
  const outOfStock = maxStock <= 0;

  const executePurchase = async (clientRequestId: string) => {
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
          quantity: qty,
          clientRequestId,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
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
              } as typeof user);
            }
          }
        } catch {
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
          setUser(updatedUser as typeof user);
        }
        return;
      }

      if (res.status === 409) {
        toast.error(data.message || 'Stock insuffisant. Réessayez avec une autre quantité.');
        return;
      }
      if (res.status === 404) {
        toast.error('Produit indisponible ou QR expiré.');
        return;
      }
      toast.error(data.message || "Erreur lors du paiement");
    } catch {
      toast.error('Erreur de connexion. Le paiement n\'a pas été effectué.');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePayClick = () => {
    if (!product || outOfStock) return;
    if (paymentMode === 'bonus' && !hasSufficientBonus) return;
    if (paymentMode === 'real' && !hasSufficientReal) return;
    setShowConfirm(true);
  };

  const confirmWithPin = () => {
    const clientRequestId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setShowConfirm(false);
    setPendingPinAction(() => {
      void executePurchase(clientRequestId);
    });
    navigateTo('pin-verify');
  };

  const Icon = product
    ? (CATEGORY_ICONS[product.category] || Package)
    : Package;
  const gradient = product
    ? CATEGORY_GRADIENTS[product.category] || CATEGORY_GRADIENTS.default
    : CATEGORY_GRADIENTS.default;

  const formatPrice = formatMarketPrice;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
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
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-semibold">Détails du produit</h1>
          {productQr && (
            <Badge variant="outline" className="ml-auto text-xs border-[#0D5C63]/40 text-[#0D5C63]">
              <ReceiptText className="size-3 mr-1" />
              Via QR
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-8">
        {/* Product image gallery */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full aspect-[4/3] bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-xl flex items-center justify-center relative overflow-hidden"
          style={gallery.length > 0 ? { background: 'none' } : undefined}
        >
          {gallery.length > 0 ? (
            <>
              <img
                src={gallery[imgIndex]}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIndex((i) => (i > 0 ? i - 1 : gallery.length - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 cursor-pointer"
                    aria-label="Photo précédente"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    onClick={() => setImgIndex((i) => (i < gallery.length - 1 ? i + 1 : 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 cursor-pointer"
                    aria-label="Photo suivante"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {gallery.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${
                          i === imgIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                        aria-label={`Photo ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <Icon className="size-20 text-white/80 relative" />
          )}

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
            <h2 className="text-xl font-bold leading-tight text-foreground">{product.name}</h2>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-0 shrink-0">
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
                    ? 'text-red-500 border-red-500/30 bg-red-500/10'
                    : product.stock <= 3
                      ? 'text-amber-500 border-amber-500/30 bg-amber-500/10'
                      : 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
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
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatPrice(unitPrice, currency)}
            </p>
            {isBonusProduct && product.bonus.bonusPrice && paymentMode === 'bonus' && (
              <p className="text-muted-foreground text-base line-through">
                {formatPrice(product.price, currency)}
              </p>
            )}
            {currency === 'FC' && (
              <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-500">FC</Badge>
            )}
          </div>

          <p className="text-muted-foreground leading-relaxed">
            {product.description}
          </p>

          {/* Payment methods accepted by seller */}
          {paymentMethodKeys.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl">
              <CreditCard className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Moyens de paiement acceptés</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {paymentMethodKeys.map((k) => (
                    <Badge key={k} variant="outline" className="text-[11px] text-muted-foreground">
                      {paymentMethodLabel(k)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Seller info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <User className="size-5 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {product.seller?.name || product.seller?.pseudo || 'Anonyme'}
            </p>
            {(product.sellerPhone || product.seller?.phone) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="size-3" />
                {product.sellerPhone || product.seller?.phone}
              </p>
            )}
            {product.sellerAddress && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3" />
                {product.sellerAddress}
              </p>
            )}
          </div>
        </motion.div>

        {/* Quantity selector */}
        {!outOfStock && maxStock > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
          >
            <div>
              <p className="text-sm font-medium text-foreground">Quantité</p>
              <p className="text-[11px] text-muted-foreground">Stock disponible : {maxStock}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="w-9 h-9"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Diminuer la quantité"
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center font-bold text-foreground">{qty}</span>
              <Button
                variant="outline"
                size="icon"
                className="w-9 h-9"
                onClick={() => setQty((q) => Math.min(maxStock, q + 1))}
                disabled={qty >= maxStock}
                aria-label="Augmenter la quantité"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Payment Mode Selection (only if bonus is enabled) */}
        {isBonusProduct && !isExpired && !isBonusOnly && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <p className="text-sm font-medium text-foreground">Mode de paiement</p>
            <div className="grid grid-cols-2 gap-2">
              {/* Real money option */}
              <button
                onClick={() => setPaymentMode('real')}
                className={`p-3 rounded-xl border-2 transition-all text-center cursor-pointer ${
                  paymentMode === 'real'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-emerald-500/40'
                }`}
              >
                <Wallet className={`size-5 mx-auto mb-1 ${paymentMode === 'real' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium text-foreground">Argent réel</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(product.price * qty, currency)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Solde: {formatPrice(realBalance, currency)}
                </p>
              </button>

              {/* Bonus option */}
              <button
                onClick={() => setPaymentMode('bonus')}
                className={`p-3 rounded-xl border-2 transition-all text-center cursor-pointer ${
                  paymentMode === 'bonus'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-border hover:border-amber-500/40'
                }`}
              >
                <Gift className={`size-5 mx-auto mb-1 ${paymentMode === 'bonus' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium text-foreground">Bonus</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {formatPrice((product.bonus.bonusPrice ?? product.price) * qty, currency)}
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
            className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300"
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
            className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-700 dark:text-red-300"
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
            className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-700 dark:text-orange-300"
          >
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Solde bonus insuffisant</p>
              <p className="text-xs mt-0.5">
                Votre bonus ({formatPrice(bonusBalance, currency)}) ne couvre pas ce montant ({formatPrice(displayPrice, currency)}).
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
          className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300"
        >
          <ShieldCheck className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Paiement sécurisé par QR + code PIN</p>
            <p className="text-xs mt-0.5">
              Scannez, confirmez le montant, validez avec votre code PIN. Aucune donnée bancaire n&apos;est transmise.
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
            onClick={handlePayClick}
            disabled={
              purchasing ||
              outOfStock ||
              (paymentMode === 'bonus' && !hasSufficientBonus) ||
              (paymentMode === 'real' && !hasSufficientReal)
            }
          >
            {purchasing ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Traitement en cours...
              </>
            ) : outOfStock ? (
              <>
                <XCircle className="size-5" />
                Rupture de stock
              </>
            ) : (
              <>
                <Lock className="size-5" />
                Payer — {formatPrice(displayPrice, currency)}
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

      {/* Confirmation Dialog (before PIN) */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Confirmer le paiement</DialogTitle>
            <DialogDescription className="text-center">
              Vérifiez les détails avant de valider avec votre code PIN.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              {gallery[0] ? (
                <img src={gallery[0]} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="size-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  Vendeur : {product.seller?.name || product.seller?.pseudo || 'Anonyme'}
                </p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantité</span>
              <span className="font-medium text-foreground">{qty}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prix unitaire</span>
              <span className="font-medium text-foreground">{formatPrice(unitPrice, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mode de paiement</span>
              <span className="font-medium text-foreground">
                {paymentMode === 'bonus' ? 'Bonus' : 'Argent réel'}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-base">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatPrice(displayPrice, currency)}
              </span>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={confirmWithPin}
            >
              <Lock className="size-4 mr-2" />
              Valider avec le code PIN
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setShowConfirm(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-2">
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <DialogTitle className="text-center">Paiement réussi !</DialogTitle>
            <DialogDescription className="text-center">
              Votre commande a été enregistrée. Le vendeur a été notifié.
            </DialogDescription>
          </DialogHeader>

          {purchaseResult && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Produit</span>
                <span className="font-medium text-foreground">{product.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantité</span>
                <span className="font-medium text-foreground">{purchaseResult.quantity ?? qty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total payé</span>
                <span className="font-semibold text-foreground">
                  {formatPrice(purchaseResult.amount, currency)}
                </span>
              </div>
              {purchaseResult.usedBonus > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Solde bonus utilisé</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    -{formatPrice(purchaseResult.usedBonus, currency)}
                  </span>
                </div>
              )}
              {purchaseResult.usedReal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Solde réel utilisé</span>
                  <span className="font-medium text-foreground">
                    -{formatPrice(purchaseResult.usedReal, currency)}
                  </span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Nouveau solde bonus</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatPrice(
                    bonusBalance - purchaseResult.usedBonus,
                    currency
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nouveau solde réel</span>
                <span className="font-medium text-foreground">
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
                navigateTo('orders');
              }}
            >
              Voir mes commandes
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowSuccess(false);
                goBack();
              }}
            >
              Retour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
