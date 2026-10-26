'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Smartphone,
  Wifi,
  Tv,
  Monitor,
  Search,
  DollarSign,
  Loader2,
  Check,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

type Category = 'airtime' | 'data' | 'dstv' | 'canalplus';

interface Product {
  id: string;
  name: string;
  amount: number;
  currency: string;
  category: Category;
  description?: string;
  dataSize?: string;
  validity?: string;
}

const categories: { id: Category; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'airtime', label: 'Airtime', icon: Smartphone, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' },
  { id: 'data', label: 'Data', icon: Wifi, color: 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400' },
  { id: 'dstv', label: 'DSTV', icon: Tv, color: 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400' },
  { id: 'canalplus', label: 'Canal+', icon: Monitor, color: 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400' },
];

export default function BundleCatalogScreen() {
  const { user, navigateTo, setPendingPinAction } = useAppStore();
  const { t } = useTranslation();
  const [category, setCategory] = useState<Category>('airtime');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const purchaseAvailable = false;

  const balanceUSD = (user?.realBalance ?? 0) + (user?.bonusBalance ?? 0);
  const balanceFC = (user?.realBalanceFC ?? 0) + (user?.bonusBalanceFC ?? 0);

  useEffect(() => { fetchProducts(); }, [category]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bundles?category=${category}`);
      const data = await res.json();
      const slug = category === 'canalplus' ? 'canal-plus' : category;
      const selectedCategory = (data.categories ?? []).find((item: { slug: string }) => item.slug === slug);
      if (data.success) {
        setProducts((selectedCategory?.products ?? []).map((product: {
          id: string; name: string; price: number; currency: string; type: string; amount: number; description?: string;
        }) => ({
          id: product.id,
          name: product.name,
          amount: product.price,
          currency: product.currency,
          category,
          description: product.description,
          dataSize: product.type === 'data' ? `${product.amount >= 1024 ? `${product.amount / 1024} Go` : `${product.amount} Mo`}` : undefined,
        })));
      } else setProducts([]);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }

  function needsPhone() {
    return category === 'airtime' || category === 'data';
  }

  function handleSelect(product: Product) {
    if (!purchaseAvailable) {
      toast.error('Le service opérateur n’est pas encore raccordé. Aucun achat ne peut être débité.');
      return;
    }
    if (needsPhone() && !phoneNumber.trim()) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }
    setSelectedProduct(product);
    setShowConfirm(true);
  }

  function handlePurchase() {
    setPendingPinAction(async () => {
      setProcessing(true);
      try {
        const res = await fetch('/api/bundles/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            productId: selectedProduct?.id,
            phoneNumber: needsPhone() ? phoneNumber : undefined,
            category,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`Achat réussi ! Réf: ${data.reference}`);
          setShowConfirm(false);
          setSelectedProduct(null);
        } else toast.error(data.message || 'Erreur');
      } catch { toast.error('Erreur de connexion'); }
      finally { setProcessing(false); }
    });
    navigateTo('pin-verify');
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Recharges & Abonnements</h1>
      </div>

      <div className="px-4 mb-4">
        <Card className="bg-gradient-to-br from-[#0D5C63] to-[#14888F] text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] opacity-80">Solde disponible</p>
              <p className="text-lg font-bold">${balanceUSD.toFixed(2)} USD</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] opacity-80">Solde FC</p>
              <p className="text-lg font-bold">{balanceFC.toLocaleString('fr-FR')} FC</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!purchaseAvailable && (
        <div className="px-4 mb-4">
          <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="flex items-start gap-3 p-3 text-amber-950 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs leading-relaxed">Catalogue consultable. Le raccordement aux opérateurs n’est pas encore actif : les achats sont désactivés et aucun montant ne sera prélevé.</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                category === cat.id ? 'bg-[#0D5C63] text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="px-4 space-y-4">
        {needsPhone() && (
          <div className="space-y-2">
            <Label>Numéro de téléphone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="+243 000 000 000" value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)} className="pl-9" />
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : products.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Aucun produit disponible</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, idx) => (
              <motion.button
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleSelect(product)}
                disabled={!purchaseAvailable}
                aria-disabled={!purchaseAvailable}
                className={`text-left p-4 rounded-xl border border-border bg-card transition-all ${purchaseAvailable ? 'hover:border-[#0D5C63]/30 hover:shadow-md active:scale-[0.98]' : 'cursor-not-allowed opacity-70'}`}
              >
                <p className="text-sm font-semibold text-foreground">{product.name}</p>
                {product.dataSize && <p className="text-[10px] text-muted-foreground mt-0.5">{product.dataSize}</p>}
                {product.validity && <p className="text-[10px] text-muted-foreground">{product.validity}</p>}
                {!purchaseAvailable && <Badge variant="secondary" className="mt-2 text-[10px]">Indisponible</Badge>}
                <p className="text-lg font-bold text-[#0D5C63] mt-2">
                  {product.currency === 'FC' ? '' : '$'}{product.amount.toFixed(2)} {product.currency === 'FC' ? 'FC' : ''}
                </p>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirmer l&apos;achat</DialogTitle>
            <DialogDescription>Vous êtes sur le point d&apos;effectuer un achat</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="rounded-xl bg-muted/50 p-4 space-y-3 my-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Produit</span>
                <span className="font-medium">{selectedProduct.name}</span>
              </div>
              {needsPhone() && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Téléphone</span>
                  <span className="font-medium">{phoneNumber}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-bold text-[#0D5C63]">
                  {selectedProduct.currency === 'FC' ? '' : '$'}{selectedProduct.amount.toFixed(2)} {selectedProduct.currency === 'FC' ? 'FC' : 'USD'}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowConfirm(false)}>Annuler</Button>
            <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={handlePurchase} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Acheter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
