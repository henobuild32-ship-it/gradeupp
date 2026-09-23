'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushSubscription() {
  const { user, token } = useAppStore()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window === 'undefined') return
    setPermission(Notification.permission)

    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return

    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(() => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub)
        })
      })
    }).catch(() => {})
  }, [user])

  const saveSubscription = useCallback(async (sub: PushSubscription) => {
    const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch('/api/notifications/push', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId: user?.id, endpoint, p256dh: keys.p256dh, auth: keys.auth }),
    })
    return res.ok
  }, [user, token])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return false

    // If already granted, try to get/create subscription without re-prompting
    let result: NotificationPermission = Notification.permission
    if (result === 'default') {
      result = await Notification.requestPermission()
      setPermission(result)
    }

    if (result !== 'granted') {
      setPermission(result)
      return false
    }

    try {
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        if (!vapidKey) {
          console.error('VAPID key missing')
          return false
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }

      const saved = await saveSubscription(sub)
      if (saved) {
        setIsSubscribed(true)
        return true
      }
      // Server rejected (e.g. auth) — browser sub exists but not saved
      setIsSubscribed(true) // at least browser-side works
      return false
    } catch (error) {
      console.error('Push subscribe error:', error)
      return false
    }
  }, [user, saveSubscription])

  const unsubscribe = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        await fetch('/api/notifications/push', { method: 'DELETE', headers })
      }
      setIsSubscribed(false)
    } catch (error) {
      console.error('Push unsubscribe error:', error)
    }
  }, [token])

  return { isSubscribed, permission, subscribe, unsubscribe }
}
