'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Trash2, Edit2, Loader2, Package } from 'lucide-react'
import { Label } from '@/components/ui/label'

import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

export default function SellerProductsScreen() {
  const { user, goBack } = useAppStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'vetements',
    imageUrl: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchProducts = async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/seller/products?sellerId=${user.id}`)
      const data = await res.json()
      if (data.success) {
        setProducts(data.products)
      }
    } catch (e) {
      toast.error('Erreur', { description: 'Impossible de charger les produits' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchProducts()
  }, [user])

  if (!user) {
    return null
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/seller/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProduct, sellerId: user.id })
      })
      const data = await res.json()
      if (data.success) {
        toast('Succès', { description: 'Produit ajouté' })
        setShowAdd(false)
        fetchProducts()
        setNewProduct({ name: '', description: '', price: '', category: 'vetements', imageUrl: '' })
      } else {
        toast.error('Erreur', { description: data.message })
      }
    } catch (e) {
      toast.error('Erreur', { description: 'Erreur réseau' })
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
        fetchProducts()
      }
    } catch (e) {
      toast.error('Erreur', { description: 'Erreur réseau' })
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between p-4 bg-white shadow-sm">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => goBack()} className="mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold text-gray-800">Mes Produits</h2>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {showAdd && (
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-indigo-100">
            <h3 className="font-bold text-lg mb-4">Nouveau Produit</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <Label>Nom du produit</Label>
                <Input required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input required value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Prix (USD)</Label>
                  <Input type="number" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Image URL (optionnel)</Label>
                  <Input value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-indigo-600">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer le produit'}
              </Button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400 bg-white rounded-2xl">
            <Package className="w-16 h-16 mb-4 opacity-20" />
            <p>Aucun produit pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package className="text-gray-400" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{p.name}</h4>
                    <p className="text-sm text-gray-500 line-clamp-1">{p.description}</p>
                    <p className="font-bold text-indigo-600">${p.price.toFixed(2)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
