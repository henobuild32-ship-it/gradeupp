'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Package,
  Palette,
  LayoutTemplate,
  Wrench,
  MonitorSmartphone,
  ShoppingBag,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

const CATEGORIES = [
  { key: '', label: 'Tout', icon: ShoppingBag },
  { key: 'design', label: 'Design', icon: Palette },
  { key: 'template', label: 'Templates', icon: LayoutTemplate },
  { key: 'service', label: 'Services', icon: Wrench },
  { key: 'digital_product', label: 'Digital', icon: MonitorSmartphone },
];

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

export default function MarketplaceScreen() {
  const { navigateTo } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [bonusFilter, setBonusFilter] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const url = activeCategory
        ? `/api/marketplace/products?category=${activeCategory}`
        : '/api/marketplace/products';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch {
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let result = products;

    // Filter by bonus
    if (bonusFilter) {
      result = result.filter((p) => p.bonus.enabled || p.bonus.only);
    }

    // Filter by search
    if (!search.trim()) {
      setFiltered(result);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    );
  }, [search, products, bonusFilter]);

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.key === category);
    return cat ? cat.icon : Package;
  };

  const getGradient = (category: string) =>
    CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.default;

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'FC') {
      return `${price.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC`;
    }
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigateTo('home')}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <ShoppingCart className="size-5 text-emerald-600" />
            <h1 className="text-lg font-semibold">Marketplace</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => navigateTo('marketplace-sell')}
          >
            Vendre
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl"
            onClick={() => navigateTo('orders')}
          >
            Commandes
          </Button>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-8">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="size-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Bonus filter toggle */}
        <button
          onClick={() => setBonusFilter(!bonusFilter)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
            bonusFilter
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-card border-border hover:bg-accent'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            bonusFilter ? 'bg-emerald-100' : 'bg-muted'
          }`}>
            <Gift className={`size-4 ${bonusFilter ? 'text-emerald-600' : 'text-muted-foreground'}`} />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-medium">Achetable avec bonus</p>
            <p className="text-xs text-muted-foreground">
              {bonusFilter ? 'Affichage des produits compatibles bonus' : 'Filtrer les produits achetables avec votre bonus'}
            </p>
          </div>
          <div className={`w-10 h-6 rounded-full relative transition-colors ${
            bonusFilter ? 'bg-emerald-500' : 'bg-muted-foreground/30'
          }`}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
              bonusFilter ? 'left-5' : 'left-1'
            }`} />
          </div>
        </button>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">Aucun produit disponible</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {bonusFilter
                ? 'Aucun produit compatible avec le bonus'
                : search
                ? 'Aucun produit ne correspond à votre recherche'
                : 'Aucun produit disponible pour le moment.'}
            </p>
            {bonusFilter && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setBonusFilter(false)}
              >
                Voir tous les produits
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((product, index) => {
                const Icon = getCategoryIcon(product.category);
                const isBonusProduct = product.bonus.enabled || product.bonus.only;
                const isExpired = product.bonus.expiryAt && new Date(product.bonus.expiryAt) < new Date();
                const displayPrice = isBonusProduct && product.bonus.bonusPrice
                  ? product.bonus.bonusPrice
                  : product.price;

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <div className="bg-card rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                      {/* Bonus badge */}
                      {isBonusProduct && !isExpired && (
                        <div className="absolute top-2 left-2 z-10">
                          <Badge className="bg-amber-400 text-amber-900 border-0 text-[10px] font-bold shadow-sm">
                            <Gift className="size-3 mr-0.5" />
                            {product.bonus.only ? 'Bonus Only' : 'Bonus OK'}
                          </Badge>
                        </div>
                      )}

                      {/* Image placeholder */}
                      <div
                        className={`aspect-square bg-gradient-to-br ${getGradient(
                          product.category
                        )} flex items-center justify-center relative cursor-pointer`}
                        onClick={() =>
                          navigateTo('marketplace-detail', {
                            productId: product.id,
                          })
                        }
                      >
                        <Icon className="size-10 text-white/80" />
                        <Badge className="absolute top-2 right-2 bg-white/20 text-white border-0 text-[10px] backdrop-blur-sm">
                          {product.category}
                        </Badge>
                      </div>

                      <div className="p-3 space-y-2">
                        <h3 className="font-medium text-sm leading-tight line-clamp-2">
                          {product.name}
                        </h3>

                        <div className="flex items-baseline gap-2">
                          <p className="text-emerald-600 font-bold text-base">
                            {formatPrice(displayPrice, product.currency)}
                          </p>
                          {isBonusProduct && product.bonus.bonusPrice && (
                            <p className="text-muted-foreground text-xs line-through">
                              {formatPrice(product.price, product.currency)}
                            </p>
                          )}
                        </div>

                        <p className="text-muted-foreground text-xs truncate">
                          par {product.seller?.name || product.seller?.pseudo || 'Anonyme'}
                        </p>
                        {typeof product.stock === 'number' && (
                          <p className={`text-[10px] font-semibold ${product.stock <= 0 ? 'text-red-500' : product.stock <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {product.stock <= 0 ? 'Rupture de stock' : `Stock: ${product.stock}`}
                          </p>
                        )}
                        <Button
                          size="sm"
                          className={`w-full text-white ${
                            product.bonus.only
                              ? 'bg-amber-500 hover:bg-amber-600'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                          disabled={typeof product.stock === 'number' && product.stock <= 0}
                          onClick={() =>
                            navigateTo('marketplace-detail', {
                              productId: product.id,
                            })
                          }
                        >
                          {typeof product.stock === 'number' && product.stock <= 0 ? (
                            'Rupture'
                          ) : product.bonus.only ? (
                            <span className="flex items-center gap-1">
                              <Gift className="size-3.5" />
                              Acheter avec bonus
                            </span>
                          ) : (
                            'Acheter'
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
