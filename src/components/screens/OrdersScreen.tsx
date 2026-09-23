'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Package,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  ShoppingBag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'

interface Order {
  id: string
  quantity: number
  amount: number
  currency: string
  status: string
  paymentStatus: string
  createdAt: string
  product: { id: string; name: string; imageUrl: string | null; category: string; qrCode: string | null }
  buyer: { id: string; name: string; pseudo: string; phone: string }
  seller: { id: string; name: string; pseudo: string; phone: string; businessName: string | null }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  paid: { label: 'Payée', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  confirmed: { label: 'Confirmée', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: CheckCircle2 },
  preparing: { label: 'Préparation', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: Truck },
  completed: { label: 'Terminée', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
}

export default function OrdersScreen() {
  const { user, goBack, navigateTo } = useAppStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer')
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchOrders = async (r: 'buyer' | 'seller' = role) => {
    if (!user) return
    try {
      const res = await fetch(`/api/orders?role=${r}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) setOrders(data.orders)
      else toast.error(data.message || 'Erreur')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchOrders(role)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role])

  if (!user) return null

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId, status }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Commande ${STATUS_CONFIG[status]?.label || status}`)
        void fetchOrders()
      } else {
        toast.error(data.message || 'Erreur')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setUpdating(null)
    }
  }

  const renderActions = (o: Order) => {
    const isBuyer = o.buyer.id === user.id
    const isSeller = o.seller.id === user.id

    return (
      <div className="flex gap-2 mt-3 flex-wrap">
        {isBuyer && ['pending', 'paid'].includes(o.status) && (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={updating === o.id}
            onClick={() => updateStatus(o.id, 'cancelled')}
          >
            Annuler
          </Button>
        )}
        {isSeller && o.status === 'paid' && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={updating === o.id}
            onClick={() => updateStatus(o.id, 'confirmed')}
          >
            Confirmer
          </Button>
        )}
        {isSeller && o.status === 'confirmed' && (
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
            disabled={updating === o.id}
            onClick={() => updateStatus(o.id, 'preparing')}
          >
            Préparer
          </Button>
        )}
        {isSeller && o.status === 'preparing' && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={updating === o.id}
            onClick={() => updateStatus(o.id, 'completed')}
          >
            Terminer
          </Button>
        )}
        {updating === o.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center gap-3 p-4 bg-white shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => goBack()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold text-gray-800">Mes Commandes</h2>
      </div>

      <div className="flex gap-2 p-4 pb-0">
        {(['buyer', 'seller'] as const).map((r) => (
          <button
            key={r}
            onClick={() => { setRole(r); setLoading(true) }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              role === r ? 'bg-[#0D5C63] text-white' : 'bg-white text-gray-500 border'
            }`}
          >
            {r === 'buyer' ? 'Achats' : 'Ventes'}
          </button>
        ))}
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#0D5C63]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400 bg-white rounded-2xl">
            <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
            <p>Aucune commande.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigateTo('marketplace')}
            >
              Parcourir la marketplace
            </Button>
          </div>
        ) : (
          orders.map((o) => {
            const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending
            const StatusIcon = cfg.icon
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-2xl shadow-sm border"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                    {o.product.imageUrl ? (
                      <img src={o.product.imageUrl} alt={o.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-gray-800 truncate">{o.product.name}</h4>
                        <p className="text-xs text-gray-500">
                          {role === 'buyer' ? `Vendeur: ${o.seller.businessName || o.seller.name}` : `Acheteur: ${o.buyer.name}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          #{o.id.slice(-8)} · {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#0D5C63]">
                          {o.amount.toFixed(2)} {o.currency}
                        </p>
                        <p className="text-[10px] text-gray-400">x{o.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`${cfg.color} border text-[10px] flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                    {renderActions(o)}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
