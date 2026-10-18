'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Wrench,
  Package,
  GraduationCap,
  Repeat,
  User,
  Tag,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';

const CATEGORIES = [
  { key: '', label: 'Tout', icon: Repeat },
  { key: 'service', label: 'Services', icon: Wrench },
  { key: 'product', label: 'Produits', icon: Package },
  { key: 'skill', label: 'Compétences', icon: GraduationCap },
];

const CATEGORY_COLORS: Record<string, string> = {
  service: 'bg-amber-100 text-amber-700 border-amber-200',
  product: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  skill: 'bg-violet-100 text-violet-700 border-violet-200',
};

interface BarterOffer {
  id: string;
  title: string;
  description: string;
  category: string;
  offeredBy: string;
  wantedItem: string | null;
  images: string | null;
  status: string;
  createdAt: string;
  user: { id: string; name: string; pseudo: string; phone: string } | null;
}

export default function BarterScreen() {
  const { goBack, navigateTo } = useAppStore();
  const [offers, setOffers] = useState<BarterOffer[]>([]);
  const [filtered, setFiltered] = useState<BarterOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const fetchOffers = useCallback(async () => {
    try {
      const res = await fetch('/api/barter/offers');
      const data = await res.json();
      if (data.success) {
        setOffers(data.offers);
      }
    } catch {
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    if (!search.trim() && !activeCategory) {
      setFiltered(offers);
      return;
    }
    setFiltered(
      offers.filter((o) => {
        const matchCategory = !activeCategory || o.category === activeCategory;
        const matchSearch =
          !search.trim() ||
          o.title.toLowerCase().includes(search.toLowerCase()) ||
          o.description.toLowerCase().includes(search.toLowerCase());
        return matchCategory && matchSearch;
      })
    );
  }, [search, activeCategory, offers]);

  const formatTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    return `il y a ${Math.floor(diff / 86400)} j`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Repeat className="size-5 text-emerald-600" />
            <h1 className="text-lg font-semibold">Troc Digital</h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => navigateTo('barter-chats')}
          >
            <MessageSquare className="size-4 mr-1" />
            Discussions
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => navigateTo('barter-create')}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Créer</span>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-12">
          Échangez sans argent
        </p>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-24">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une offre..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
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

        {/* Offers list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <RefreshCw className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">Aucune publication</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search
                ? 'Aucune offre ne correspond à votre recherche'
                : 'Aucune publication disponible pour le moment.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((offer, index) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        {(() => {
                          let thumb: string | null = null
                          if (offer.images) {
                            try {
                              const parsed = JSON.parse(offer.images)
                              if (Array.isArray(parsed) && typeof parsed[0] === 'string') thumb = parsed[0]
                            } catch { thumb = null }
                          }
                          return thumb ? (
                            <img src={thumb} alt={offer.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                          ) : null
                        })()}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-base leading-tight text-foreground">
                              {offer.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className={
                                CATEGORY_COLORS[offer.category] ||
                                'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground'
                              }
                            >
                              {offer.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {offer.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="size-3.5" />
                        <span>
                          Offert par{' '}
                          {offer.user?.name ||
                            offer.user?.pseudo ||
                            'Anonyme'}
                        </span>
                      </div>

                      {offer.wantedItem && (
                        <div className="flex items-center gap-2 text-sm">
                          <Tag className="size-3.5 text-emerald-600" />
                          <span className="text-muted-foreground">
                            Recherche :{' '}
                          </span>
                          <span className="font-medium text-emerald-700">
                            {offer.wantedItem}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(offer.createdAt)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() =>
                            navigateTo('barter-detail', {
                              offerId: offer.id,
                            })
                          }
                        >
                          <Eye className="size-3.5" />
                          Voir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating action button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="fixed bottom-6 right-6 z-20"
      >
        <Button
          size="lg"
          className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
          onClick={() => navigateTo('barter-create')}
        >
          <Plus className="size-6" />
        </Button>
      </motion.div>
    </div>
  );
}
