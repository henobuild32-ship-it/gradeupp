'use client'

import { useEffect, useState, useCallback } from 'react'
import { WifiOff, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { syncPendingTransactions } from '@/lib/offline-queue'
import { toast } from 'sonner'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [showPending, setShowPending] = useState(false)

  // Listen for SW messages about sync status
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        setSyncing(false)
        const { synced, failed } = event.data
        if (synced > 0) toast.success(`${synced} transaction(s) synchronisée(s)`)
        if (failed > 0) toast.error(`${failed} échec(s) de synchronisation`)
      }
      if (event.data?.type === 'TRANSACTION_QUEUED') {
        setShowPending(true)
        toast.info('Transaction enregistrée hors ligne')
      }
    }
    navigator.serviceWorker?.addEventListener('message', handler)
    return () => navigator.serviceWorker?.removeEventListener('message', handler)
  }, [])

  const doSync = useCallback(async () => {
    setSyncing(true)
    const result = await syncPendingTransactions()
    if (result.synced > 0) toast.success(`${result.synced} transaction(s) synchronisée(s)`)
    if (result.failed > 0) toast.error(`${result.failed} échec(s)`)
    setSyncing(false)
  }, [])

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      doSync()
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowPending(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Sync on mount if online
    if (navigator.onLine) {
      syncPendingTransactions().then((r) => {
        if (r.synced > 0) toast.success(`${r.synced} transaction(s) synchronisée(s)`)
      })
    }

    // Check pending count periodically
    const interval = setInterval(async () => {
      try {
        const { getPendingTransactions } = await import('@/lib/offline-queue')
        const pending = await getPendingTransactions()
        setPendingCount(pending.length)
        setShowPending(pending.length > 0)
      } catch {}
    }, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [doSync])

  if (isOnline && !showPending) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto pointer-events-none">
      {!isOnline ? (
        <div className="bg-amber-500 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 pointer-events-auto">
          <WifiOff className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Vous êtes hors ligne</p>
            <p className="text-xs text-white/80">Les opérations financières nécessitent une connexion active.</p>
          </div>
          {syncing ? (
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <button onClick={doSync} className="text-xs font-semibold underline shrink-0">
              Sync
            </button>
          )}
        </div>
      ) : (
        pendingCount > 0 && (
          <div className="bg-emerald-500 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 pointer-events-auto">
            <Clock className="w-4 h-4 shrink-0" />
            <span className="text-xs flex-1">{pendingCount} transaction(s) en attente de synchronisation</span>
            {syncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <button onClick={doSync} className="text-xs font-semibold underline shrink-0">
                Synchroniser
              </button>
            )}
          </div>
        )
      )}
    </div>
  )
}
