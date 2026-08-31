'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Plus, QrCode, CreditCard, LogOut, Package, History, RefreshCw, Loader2, Sparkles, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function SellerDashboard() {
  const { user, setUser, navigateTo, logout, unreadCount } = useAppStore()
  const [requestingCard, setRequestingCard] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showWelcome, setShowWelcome] = useState(!!(user && user.validationStatus === 'validated' && user.validationRejectReason))
  const [clearingWelcome, setClearingWelcome] = useState(false)

  if (!user) return null

  const handleCloseWelcome = async () => {
    if (!user) return
    setClearingWelcome(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, validationRejectReason: null })
      })
      const data = await res.json()
      if (data.success) {
        setUser({ ...user, validationRejectReason: null })
      }
      setShowWelcome(false)
    } catch (error) {
      console.error(error)
      setUser({ ...user, validationRejectReason: null })
      setShowWelcome(false)
    } finally {
      setClearingWelcome(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/auth/profile?userId=${user.id}`)
      const data = await res.json()
      if (data.success && data.user) {
        setUser({ ...user, ...data.user })
        toast('Succès', { description: 'Données mises à jour' })
      } else {
        toast('Info', { description: 'Données à jour' })
      }
    } catch (error) {
      toast.error('Erreur', { description: 'Erreur lors de la mise à jour' })
    } finally {
      setRefreshing(false)
    }
  }

  const handleRequestCard = async () => {
    setRequestingCard(true)
    try {
      const res = await fetch('/api/cards/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, cardType: 'USD' })
      })
      const data = await res.json()
      if (data.success) {
        toast('Succès', { description: 'Demande de Carte Trait envoyée à l\'administration.' })
      } else {
        toast.error('Erreur', { description: data.message || 'Erreur lors de la demande' })
      }
    } catch (error) {
      toast.error('Erreur', { description: 'Erreur réseau' })
    } finally {
      setRequestingCard(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-800">{user.businessName}</h1>
            {user.validationStatus === 'validated' && (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-300">
                Validé
              </span>
            )}
            {user.validationStatus === 'pending' && (
              <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full border border-yellow-300">
                En attente
              </span>
            )}
            {user.validationStatus === 'rejected' && (
              <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-300">
                Rejeté
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{user.name} • {user.location}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateTo('notifications')} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-600 hover:text-gray-800"
            title="Actualiser les données"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => logout()} className="text-red-500">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <CreditCard className="w-24 h-24" />
        </div>
        <p className="text-blue-100 mb-1">Solde Service</p>
        <h2 className="text-4xl font-bold mb-4">${user.realBalance?.toFixed(2) || '0.00'}</h2>
        <div className="flex gap-2">
          <Button onClick={handleRequestCard} disabled={requestingCard} variant="secondary" className="bg-white/20 hover:bg-white/30 border-none text-white">
            <CreditCard className="w-4 h-4 mr-2" />
            Demander une Carte Trait
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={() => navigateTo('seller-qr-scanner')} className="h-24 flex flex-col items-center justify-center bg-white text-gray-800 border hover:border-indigo-500 hover:bg-indigo-50 transition-all rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="font-semibold">Scanner Paiement</span>
        </Button>

        <Button onClick={() => navigateTo('seller-products')} className="h-24 flex flex-col items-center justify-center bg-white text-gray-800 border hover:border-blue-500 hover:bg-blue-50 transition-all rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
            <Package className="w-5 h-5" />
          </div>
          <span className="font-semibold">Mes Produits</span>
        </Button>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex-1">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-500" />
          Activité Récente
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Package className="w-12 h-12 mb-2 opacity-20" />
          <p>Aucune transaction récente</p>
        </div>
      </div>

      {/* TRAIT IA Help Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-4 mb-4"
      >
        <button
          onClick={() => navigateTo('trait-ai-welcome')}
          className="w-full bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/20 rounded-2xl p-4 flex items-center gap-3 hover:from-violet-600/20 hover:to-indigo-600/20 hover:border-violet-500/30 transition-all"
        >
          <div className="relative w-10 h-10 flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 blur-sm opacity-60" />
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="10" r="3" fill="white" />
                <path d="M7 18.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
                <circle cx="9" cy="8" r="1" fill="white" />
                <circle cx="15" cy="8" r="1" fill="white" />
              </svg>
            </div>
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-violet-400">Besoin d&apos;aide ?</p>
            <p className="text-xs text-gray-400">Parler à TRAIT IA</p>
          </div>
          <span className="text-violet-400 text-lg">→</span>
        </button>
      </motion.div>

      {/* Welcome Dialog */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-md text-center p-6 rounded-2xl">
          <DialogHeader className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-inner mb-4 animate-bounce">
              <Sparkles className="w-8 h-8 text-emerald-500" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-800 tracking-tight">
              Bienvenue dans le réseau TRAIT !
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Votre compte service a été officiellement approuvé par l'administrateur.
            </DialogDescription>
          </DialogHeader>

          {user && user.validationRejectReason && (
            <div className="mt-4 p-4 bg-emerald-50/75 border border-emerald-100 rounded-2xl text-emerald-850 text-sm text-left leading-relaxed">
              <p className="font-extrabold text-xs text-emerald-900 uppercase tracking-wider mb-1">
                Message de l'administrateur :
              </p>
              <p className="italic font-medium">"{user.validationRejectReason}"</p>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-4 max-w-sm mx-auto">
            Félicitations, vous pouvez dès à présent configurer vos produits, consulter vos statistiques et scanner des codes de paiements TRAIT.
          </div>

          <DialogFooter className="mt-6">
            <Button
              onClick={handleCloseWelcome}
              disabled={clearingWelcome}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-6 font-bold hover:shadow-lg transition-all"
            >
              {clearingWelcome ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Accéder à mon espace"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
