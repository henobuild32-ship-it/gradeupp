'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  User,
  ArrowRight,
  Download,
  Smartphone,
  Shield,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface PublicUser {
  id: string
  name: string
  pseudo: string
  phone: string
}

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [appOpened, setAppOpened] = useState(false)

  useEffect(() => {
    if (!userId) return

    // Fetch public user info
    fetch(`/api/users/public/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user)
        } else {
          setError(data.message || 'Utilisateur non trouvé')
        }
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))

    // Check if visitor is logged in
    fetch('/api/auth/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) {
          setIsLoggedIn(data.user.id !== userId)
        }
      })
      .catch(() => {})
  }, [userId])

  const openApp = () => {
    setAppOpened(true)
    // Try native app deep link
    window.location.assign(`trait://pay/${userId}`)
    // Fallback: after 800ms, redirect to PWA home with pay param
    setTimeout(() => {
      router.push(`/?pay=${encodeURIComponent(userId)}`)
    }, 800)
  }

  const handlePay = () => {
    router.push(`/?pay=${encodeURIComponent(userId)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0D5C63] mx-auto mb-3" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Utilisateur introuvable</h1>
          <p className="text-gray-500 text-sm mb-6">
            Ce lien de paiement n&apos;est pas valide ou l&apos;utilisateur n&apos;existe plus.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-[#14888F] font-medium text-sm hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Aller sur TRAIT
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-[#0D5C63] flex items-center justify-center shadow-lg mb-6 ring-4 ring-[#0D5C63]/10">
          <span className="text-white text-4xl font-bold">
            {(user.name || user.pseudo || '?')[0].toUpperCase()}
          </span>
        </div>

        {/* User Info */}
        <h1 className="text-2xl font-bold text-gray-900 text-center">{user.name}</h1>
        <p className="text-lg text-gray-500 text-center mt-1">@{user.pseudo}</p>
        <p className="text-sm text-gray-400 text-center mt-1">{user.phone}</p>

        {/* Divider */}
        <div className="w-16 h-0.5 bg-[#0D5C63]/20 rounded-full my-6" />

        {/* Action */}
        {isLoggedIn ? (
          <button
            onClick={handlePay}
            className="w-full max-w-xs h-14 bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-2xl shadow-lg shadow-[#0D5C63]/20 text-base font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            Payer {user.name?.split(' ')[0] || user.pseudo}
            <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={openApp}
            className="w-full max-w-xs h-14 bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-2xl shadow-lg shadow-[#0D5C63]/20 text-base font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            Payer avec TRAIT
            <ArrowRight className="h-5 w-5" />
          </button>
        )}

        {/* App download */}
        {!isLoggedIn && !appOpened && (
          <div className="mt-8 w-full max-w-xs">
            <p className="text-xs text-gray-400 text-center mb-3">Vous n&apos;avez pas TRAIT ?</p>
            <div className="flex gap-3">
              <a
                href="/downloads/trait.apk"
                download="TRAIT-v2.0.0.apk"
                className="flex-1 h-12 bg-[#0D5C63] rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white hover:bg-[#0a4a50] transition-colors"
              >
                <Download className="h-4 w-4" />
                APK Android
              </a>
              <a
                href="https://apps.apple.com/app/trait/id000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
              >
                <Smartphone className="h-4 w-4" />
                iOS
              </a>
            </div>
          </div>
        )}

        {/* Trust */}
        {!isLoggedIn && (
          <div className="mt-8 flex items-center gap-2 text-xs text-gray-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Paiement sécurisé de bout en bout</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-xs text-gray-300">
          TRAIT <span className="font-bold">v2.0</span> &mdash; Paiement par scan
        </p>
      </div>
    </div>
  )
}
