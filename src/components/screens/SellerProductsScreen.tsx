'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Package,
  QrCode,
  MapPin,
  Phone,
  CreditCard,
  Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import ProductImagePicker from '@/components/marketplace/ProductImagePicker'
import {
  PRODUCT_PAYMENT_METHODS,
  parseImages,
  parsePaymentMethods,
} from '@/lib/marketplace'

const CATEGORIES = [
  { key: 'vetements', label: 'Vêtements' },
  { key: 'electronique', label: 'Électronique' },
  { key: 'alimentation', label: 'Alimentation' },
  { key: 'maison', label: 'Maison' },
  { key: 'service', label: 'Services' },
  { key: 'design', label: 'Design' },
  { key: 'template', label: 'Templates' },
  { key: 'digital_product', label: 'Numérique' },
  { key: 'autre', label: 'Autre' },
]

interface SellerProduct {
  id: string
  name: string
  description: string
  price: number
  currency: string
  category: string
  imageUrl: string | null
  images: string | null
  paymentMethods: string | null
  sellerPhone: string | null
  sellerAddress: string | null
  stock: number
  condition: string
  qrCode: string | null
  active: boolean
}

export default function SellerProductsScreen() {
  const { user, goBack } = useAppStore()
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [formError, setFormError] = useState('')
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    category: 'vetements',
    stock: '1',
    condition: 'new',
    sellerPhone: '',
    sellerAddress: '',
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['trait_number'])
  const [submitting, setSubmitting] = useState(false)
  const [qrProduct, setQrProduct] = useState<SellerProduct | null>(null)

  const fetchProducts = async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/seller/products?sellerId=${user.id}`)
      const data = await res.json()
      if (data.success) {
        setProducts(data.products)
      }
    } catch {
      toast.error('Erreur', { description: 'Impossible de charger les produits' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchProducts()
     
  }, [user])

  useEffect(() => {
    if (user?.phone && !newProduct.sellerPhone) {
      setNewProduct((p) => ({ ...p, sellerPhone: user.phone }))
    }
     
  }, [user?.phone])

  if (!user) return null

  const togglePaymentMethod = (key: string) => {
    setPaymentMethods((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    )
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (photos.length === 0) {
      setFormError('Ajoutez au moins une photo du produit.')
      return
    }
    if (paymentMethods.length === 0) {
      setFormError('Sélectionnez au moins un moyen de paiement.')
      return
    }
    if (!newProduct.sellerPhone.trim()) {
      setFormError('Indiquez un numéro de téléphone contact.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/seller/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          price: newProduct.price,
          currency: newProduct.currency,
          category: newProduct.category,
          stock: newProduct.stock,
          condition: newProduct.condition,
          images: photos,
          paymentMethods,
          sellerPhone: newProduct.sellerPhone,
          sellerAddress: newProduct.sellerAddress,
          sellerId: user.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast('Succès', { description: 'Produit publié sur la marketplace' })
        setShowAdd(false)
        setPhotos([])
        setPaymentMethods(['trait_number'])
        setNewProduct({
          name: '',
          description: '',
          price: '',
          currency: 'USD',
          category: 'vetements',
          stock: '1',
          condition: 'new',
          sellerPhone: user.phone || '',
          sellerAddress: '',
        })
        void fetchProducts()
      } else {
        setFormError(data.message || 'Erreur lors de la publication')
      }
    } catch {
      setFormError('Erreur réseau. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Voulez-vous supprimer ce produit ?')) return
    try {
      const res = await fetch(`/api/seller/products?productId=${productId}&sellerId=${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast('Succès', { description: 'Produit supprimé' })
        void fetchProducts()
      }
    } catch {
      toast.error('Erreur', { description: 'Erreur réseau' })
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => goBack()} className="mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">Mes Produits</h2>
        </div>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-[#0D5C63] hover:bg-[#0A4A50] text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-24">
        {showAdd && (
          <div className="bg-card p-4 rounded-2xl border border-border mb-6">
            <h3 className="font-bold text-lg mb-4 text-foreground">Nouveau Produit</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-foreground">Photos du produit *</Label>
                <ProductImagePicker images={photos} onChange={setPhotos} max={5} />
              </div>

              <div className="space-y-1">
                <Label className="text-foreground">Nom du produit *</Label>
                <Input
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Ex : Robe wax premium"
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-foreground">Description *</Label>
                <textarea
                  required
                  rows={3}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Décrivez le produit, la taille, la couleur, la livraison…"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground">Prix *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground">Devise *</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                    value={newProduct.currency}
                    onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value })}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="FC">CDF</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground">Stock *</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground">État *</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                    value={newProduct.condition}
                    onChange={(e) => setNewProduct({ ...newProduct, condition: e.target.value })}
                  >
                    <option value="new">Neuf</option>
                    <option value="used">Occasion</option>
                    <option value="refurbished">Reconditionné</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground">Catégorie *</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-1">
                  <CreditCard className="size-3.5" /> Moyens de paiement acceptés *
                </Label>
                <div className="space-y-2">
                  {PRODUCT_PAYMENT_METHODS.map((method) => {
                    const selected = paymentMethods.includes(method.key)
                    return (
                      <button
                        type="button"
                        key={method.key}
                        onClick={() => togglePaymentMethod(method.key)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left cursor-pointer ${
                          selected
                            ? 'border-[#0D5C63] bg-[#0D5C63]/5'
                            : 'border-border hover:border-[#0D5C63]/30'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                            selected
                              ? 'bg-[#0D5C63] border-[#0D5C63]'
                              : 'border-muted-foreground/40'
                          }`}
                        >
                          {selected && <Check className="size-3 text-white" />}
                        </div>
                        <span className="text-sm font-medium text-foreground">{method.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-foreground flex items-center gap-1">
                    <Phone className="size-3.5" /> Téléphone contact *
                  </Label>
                  <Input
                    required
                    value={newProduct.sellerPhone}
                    onChange={(e) => setNewProduct({ ...newProduct, sellerPhone: e.target.value })}
                    placeholder="+243…"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground flex items-center gap-1">
                    <MapPin className="size-3.5" /> Adresse / quartier
                  </Label>
                  <Input
                    value={newProduct.sellerAddress}
                    onChange={(e) => setNewProduct({ ...newProduct, sellerAddress: e.target.value })}
                    placeholder="Ex : Gombe, Kinshasa"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0D5C63] hover:bg-[#0A4A50] text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Publication…
                  </>
                ) : (
                  'Publier le produit'
                )}
              </Button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#0D5C63]" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-card rounded-2xl border border-border">
            <Package className="w-16 h-16 mb-4 opacity-20" />
            <p>Aucun produit pour le moment.</p>
            <p className="text-xs mt-1">Ajoutez votre premier produit pour le vendre.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((p) => {
              const imgs = parseImages(p.images)
              const cover = imgs[0] || p.imageUrl
              const methods = parsePaymentMethods(p.paymentMethods)
              return (
                <div key={p.id} className="bg-card p-4 rounded-xl border border-border flex items-start justify-between gap-2">
                  <div className="flex gap-4 min-w-0">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                      {cover ? (
                        <img src={cover} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-foreground truncate">{p.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                      <p className="font-bold text-[#0D5C63]">
                        {p.currency === 'FC' ? `${p.price.toLocaleString('fr-FR')} CDF` : `${p.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Stock: {p.stock ?? 1} · {p.condition === 'used' ? 'Occasion' : p.condition === 'refurbished' ? 'Reconditionné' : 'Neuf'} · {imgs.length || (cover ? 1 : 0)} photo(s)
                      </p>
                      {methods.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {methods.map((m) => (
                            <Badge key={m} variant="outline" className="text-[9px] text-muted-foreground">
                              {PRODUCT_PAYMENT_METHODS.find((pm) => pm.key === m)?.label || m}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        {p.sellerAddress && (
                          <span className="text-[10px] text-muted-foreground truncate">📍 {p.sellerAddress}</span>
                        )}
                        {p.sellerPhone && (
                          <span className="text-[10px] text-muted-foreground truncate">📞 {p.sellerPhone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {p.qrCode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setQrProduct(p)}
                        className="text-[#0D5C63] hover:text-[#0A4A50] hover:bg-[#0D5C63]/10"
                        aria-label="Voir le QR code"
                      >
                        <QrCode className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      aria-label="Supprimer le produit"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!qrProduct} onOpenChange={(open) => { if (!open) setQrProduct(null) }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code produit</DialogTitle>
          </DialogHeader>
          {qrProduct?.qrCode && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={qrProduct.qrCode} size={200} />
              </div>
              <p className="text-sm font-medium text-foreground text-center">{qrProduct.name}</p>
              <p className="text-[11px] text-muted-foreground font-mono break-all text-center">
                {qrProduct.qrCode}
              </p>
              <p className="text-[11px] text-muted-foreground text-center">
                L&apos;acheteur scanne ce QR pour payer via la marketplace TRAIT.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
