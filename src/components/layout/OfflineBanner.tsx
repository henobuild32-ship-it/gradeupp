'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine)
    updateOnlineState()
    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)
    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-amber-500 px-4 py-3 text-white shadow-xl"
    >
      <WifiOff className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">Vous êtes hors ligne</p>
        <p className="text-xs text-white/90">Les opérations nécessitent une connexion active et ne sont pas enregistrées hors ligne.</p>
      </div>
    </div>
  )
}
