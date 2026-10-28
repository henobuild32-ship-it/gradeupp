'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  ShoppingBag,
  Tag,
  User,
  Gift,
  Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  imageUrl: string | null;
  active: boolean;
  sellerId: string | null;
  seller: { id: string; name: string; pseudo: string } | null;
  bonusEnabled: boolean;
  bonusOnly: boolean;
  bonusPrice: number | null;
  bonusMaxQty: number | null;
  bonusExpiryAt: string | null;
  createdAt: string;
}

const categories = [
  { value: 'design', label: 'Design' },
  { value: 'template', label: 'Template' },
  { value: 'service', label: 'Service' },
  { value: 'digital_product', label: 'Produit Digital' },
  { value: 'other', label: 'Autre' },
];

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'FC', label: 'CDF (Franc congolais)' },
];

function getCategoryConfig(cat: string) {
  switch (cat) {
    case 'design':
      return { label: 'Design', color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800/40' };
    case 'template':
      return { label: 'Template', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/40' };
    case 'service':
      return { label: 'Service', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800/40' };
    case 'digital_product':
      return { label: 'Produit Digital', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40' };
    default:
      return { label: cat, color: 'bg-muted text-muted-foreground border-border' };
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPrice(amount: number, currency: string): string {
  if (currency === 'FC') {
    return `${amount.toLocaleString('fr-FR')} CDF`;
  }
  return `$${amount.toFixed(2)}`;
}

const emptyForm = {
  name: '',
  description: '',
  price: '',
  currency: 'USD',
  category: '',
  imageUrl: '',
  bonusEnabled: false,
  bonusOnly: false,
  bonusPrice: '',
  bonusMaxQty: '',
  bonusExpiryAt: '',
};

export default function AdminMarketScreen() {
  const { admin, goBack } = useAppStore();

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Create / Edit dialog
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Fetch Products ────────────────────────────────────────────

  const fetchProducts = useCallback(async (p: number, append: boolean) => {
    if (!append) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '10');

      const res = await fetch(`/api/admin/market?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        const fetched: Product[] = data.products ?? [];
        if (append) {
          setProducts((prev) => [...prev, ...fetched]);
        } else {
          setProducts(fetched);
        }
        setHasMore(fetched.length >= 10);
        setPage(p);
      } else {
        toast.error(data.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(1, false);
  }, [fetchProducts]);

  function handleLoadMore() {
    fetchProducts(page + 1, true);
  }

  // ─── Create / Edit Product ─────────────────────────────────────

  function openCreateDialog() {
    setEditingProduct(null);
    setForm(emptyForm);
    setFormDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      currency: product.currency || 'USD',
      category: product.category,
      imageUrl: product.imageUrl ?? '',
      bonusEnabled: product.bonusEnabled || false,
      bonusOnly: product.bonusOnly || false,
      bonusPrice: product.bonusPrice ? String(product.bonusPrice) : '',
      bonusMaxQty: product.bonusMaxQty ? String(product.bonusMaxQty) : '',
      bonusExpiryAt: product.bonusExpiryAt
        ? new Date(product.bonusExpiryAt).toISOString().split('T')[0]
        : '',
    });
    setFormDialogOpen(true);
  }

  async function handleFormSubmit() {
    if (!admin?.id) {
      toast.error('Session admin invalide');
      return;
    }
    if (!form.name.trim() || !form.description.trim() || !form.price || !form.category) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Le prix doit être un nombre positif');
      return;
    }

    if (form.bonusEnabled && form.bonusPrice) {
      const bp = parseFloat(form.bonusPrice);
      if (isNaN(bp) || bp <= 0) {
        toast.error('Le prix bonus doit être un nombre positif');
        return;
      }
    }

    setFormLoading(true);
    try {
      const isEdit = !!editingProduct;
      const res = await fetch('/api/admin/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          action: isEdit ? 'update' : 'create',
          productId: editingProduct?.id,
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          currency: form.currency,
          category: form.category,
          imageUrl: form.imageUrl.trim() || undefined,
          bonusEnabled: form.bonusEnabled,
          bonusOnly: form.bonusEnabled && form.bonusOnly,
          bonusPrice: form.bonusEnabled && form.bonusPrice ? parseFloat(form.bonusPrice) : undefined,
          bonusMaxQty: form.bonusEnabled && form.bonusMaxQty ? parseInt(form.bonusMaxQty, 10) : undefined,
          bonusExpiryAt: form.bonusEnabled && form.bonusExpiryAt ? new Date(form.bonusExpiryAt).toISOString() : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(isEdit ? 'Produit modifié avec succès' : 'Produit publié avec succès');
        setFormDialogOpen(false);
        setEditingProduct(null);
        fetchProducts(1, false);
      } else {
        toast.error(data.error || "Échec de l'opération");
      }
    } catch (err) {
      console.error('Form submit error:', err);
      toast.error("Erreur lors de l'opération");
    } finally {
      setFormLoading(false);
    }
  }

  // ─── Toggle Active ─────────────────────────────────────────────

  async function handleToggleActive(product: Product) {
    if (!admin?.id) {
      toast.error('Session admin invalide');
      return;
    }

    try {
      const res = await fetch('/api/admin/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          action: 'toggle',
          productId: product.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(product.active ? 'Produit désactivé' : 'Produit activé');
        fetchProducts(1, false);
      } else {
        toast.error(data.error || 'Échec de la mise à jour');
      }
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  }

  // ─── Delete Product ────────────────────────────────────────────

  function openDeleteDialog(product: Product) {
    setDeleteTarget(product);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !admin?.id) {
      toast.error('Données manquantes');
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch('/api/admin/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          action: 'delete',
          productId: deleteTarget.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${deleteTarget.name} a été supprimé`);
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        fetchProducts(1, false);
      } else {
        toast.error(data.error || 'Échec de la suppression');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────

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
          <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Retour</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              Market - Produits
            </h1>
            <p className="text-xs text-muted-foreground">
              {products.length} produit{products.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Publier un Produit</span>
            <span className="sm:hidden">Publier</span>
          </Button>
        </div>
      </motion.div>

      <div className="px-4 pt-4 space-y-4">
        {/* Products List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' as const }}
          >
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-base font-medium text-foreground mb-1">
                  Aucun produit dans le Market
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Commencez par publier un nouveau produit
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <div className="space-y-3">
              {products.map((product, index) => {
                const catConfig = getCategoryConfig(product.category);
                const isExpired = product.bonusExpiryAt && new Date(product.bonusExpiryAt) < new Date();

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03, ease: 'easeOut' as const }}
                  >
                    <Card className="border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        {/* Top row: name + badges + actions */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {product.name}
                            </h3>
                            <Badge className={`text-xs font-medium ${catConfig.color}`}>
                              {catConfig.label}
                            </Badge>
                            <Badge className={`text-xs ${
                              product.active
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40'
                                : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-800/40'
                            }`}>
                              {product.active ? 'Actif' : 'Inactif'}
                            </Badge>
                            {product.bonusEnabled && !isExpired && (
                              <Badge className="text-xs font-medium bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/40">
                                <Gift className="h-3 w-3 mr-0.5" />
                                {product.bonusOnly ? 'Bonus Only' : 'Bonus'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              onClick={() => openEditDialog(product)}
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Modifier</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 rounded-md ${
                                product.active
                                  ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              }`}
                              onClick={() => handleToggleActive(product)}
                              title={product.active ? 'Désactiver' : 'Activer'}
                            >
                              {product.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              <span className="sr-only">{product.active ? 'Désactiver' : 'Activer'}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => openDeleteDialog(product)}
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Supprimer</span>
                            </Button>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {product.description}
                        </p>

                        <Separator className="my-2" />

                        {/* Bottom row: price, bonus price, seller, date */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {formatPrice(product.price, product.currency || 'USD')}
                            </span>
                            {product.bonusEnabled && product.bonusPrice && !isExpired && (
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                Bonus: {formatPrice(product.bonusPrice, product.currency || 'USD')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              <span>{product.seller?.name || product.seller?.pseudo || 'TRAIT Admin'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(product.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800/40 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Chargement...
                    </>
                  ) : (
                    'Charger plus'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Create / Edit Dialog ─────────────────────────────────── */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              {editingProduct ? 'Modifier le Produit' : 'Publier un Produit'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Modifiez les informations du produit.'
                : 'Remplissez les informations pour publier un nouveau produit.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="product-name">Nom <span className="text-red-500">*</span></Label>
              <Input
                id="product-name"
                placeholder="Nom du produit"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">Description <span className="text-red-500">*</span></Label>
              <Textarea
                id="product-description"
                placeholder="Décrivez le produit..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="bg-muted/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="product-price">Prix <span className="text-red-500">*</span></Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select
                  value={form.currency}
                  onValueChange={(val) => setForm((f) => ({ ...f, currency: val }))}
                >
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catégorie <span className="text-red-500">*</span></Label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm((f) => ({ ...f, category: val }))}
              >
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-image">Image URL</Label>
              <Input
                id="product-image"
                placeholder="https://exemple.com/image.jpg (optionnel)"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                className="bg-muted/50"
              />
            </div>

            <Separator />

            {/* ─── Bonus Settings ─────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" />
                <Label className="text-base font-semibold">Paramètres Bonus</Label>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div>
                  <p className="text-sm font-medium">Paiement avec bonus</p>
                  <p className="text-xs text-muted-foreground">
                    Permettre l&apos;achat avec le solde bonus
                  </p>
                </div>
                <Switch
                  checked={form.bonusEnabled}
                  onCheckedChange={(checked) => setForm((f) => ({
                    ...f,
                    bonusEnabled: checked,
                    bonusOnly: checked ? f.bonusOnly : false,
                  }))}
                />
              </div>

              {form.bonusEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pl-2"
                >
                  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                    <div>
                      <p className="text-sm font-medium">Exclusif bonus</p>
                      <p className="text-xs text-muted-foreground">
                        Uniquement achetable avec le bonus
                      </p>
                    </div>
                    <Switch
                      checked={form.bonusOnly}
                      onCheckedChange={(checked) => setForm((f) => ({ ...f, bonusOnly: checked }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bonus-price">Prix bonus (optionnel)</Label>
                    <Input
                      id="bonus-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Prix spécial pour paiement bonus"
                      value={form.bonusPrice}
                      onChange={(e) => setForm((f) => ({ ...f, bonusPrice: e.target.value }))}
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Si vide, le prix normal sera utilisé
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bonus-max-qty">Max achats par utilisateur (optionnel)</Label>
                    <Input
                      id="bonus-max-qty"
                      type="number"
                      min="1"
                      placeholder="Limite d'achats avec bonus"
                      value={form.bonusMaxQty}
                      onChange={(e) => setForm((f) => ({ ...f, bonusMaxQty: e.target.value }))}
                      className="bg-muted/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bonus-expiry">Date d&apos;expiration bonus (optionnel)</Label>
                    <Input
                      id="bonus-expiry"
                      type="date"
                      value={form.bonusExpiryAt}
                      onChange={(e) => setForm((f) => ({ ...f, bonusExpiryAt: e.target.value }))}
                      className="bg-muted/50"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFormDialogOpen(false)} disabled={formLoading}>
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handleFormSubmit}
              disabled={formLoading}
            >
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {editingProduct ? 'Modification...' : 'Publication...'}
                </>
              ) : editingProduct ? (
                'Enregistrer'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Publier
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Supprimer le produit
            </DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer <strong>{deleteTarget?.name}</strong> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
