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
  const userId = user?.id
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [configurationAvailable, setConfigurationAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsSubscribed(false)
    if (typeof window === 'undefined' || !userId) {
      setConfigurationAvailable(null)
      return
    }
    if ('Notification' in window) setPermission(Notification.permission)
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setConfigurationAvailable(null)
      return
    }

    async function syncSubscription() {
      try {
        await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        const query = sub ? `?endpoint=${encodeURIComponent(sub.endpoint)}` : ''
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`/api/notifications/push${query}`, { headers, cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error('status')
        if (!cancelled) {
          setConfigurationAvailable(Boolean(data.available))
          setIsSubscribed(Boolean(sub && data.subscribed))
        }
      } catch {
        if (!cancelled) {
          setConfigurationAvailable(null)
          setIsSubscribed(false)
        }
      }
    }

    void syncSubscription()
    return () => { cancelled = true }
  }, [userId, token])

  const saveSubscription = useCallback(async (sub: PushSubscription): Promise<'success' | 'configuration' | 'failed'> => {
    const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch('/api/notifications/push', {
      method: 'POST',
      headers,
      body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
    })
    if (res.ok) return 'success'
    const data = await res.json().catch(() => null)
    return data?.code === 'PUSH_NOT_CONFIGURED' ? 'configuration' : 'failed'
  }, [userId, token])

  const subscribe = useCallback(async (): Promise<'success' | 'denied' | 'prompt' | 'configuration' | 'failed' | 'unsupported'> => {
    if (typeof window === 'undefined') return 'unsupported'
    if (!user || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    if (!vapidKey) {
      setConfigurationAvailable(false)
      return 'configuration'
    }

    // If already granted, try to get/create subscription without re-prompting
    let result: NotificationPermission = Notification.permission
    if (result === 'default') {
      result = await Notification.requestPermission()
      setPermission(result)
    }

    if (result !== 'granted') {
      setPermission(result)
      return result === 'denied' ? 'denied' : 'prompt'
    }

    try {
      await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }

      const saved = await saveSubscription(sub)
      if (saved === 'success') {
        setConfigurationAvailable(true)
        setIsSubscribed(true)
        return 'success'
      }
      // Browser subscription alone is not enough: the server must persist it.
      setIsSubscribed(false)
      if (saved === 'configuration') setConfigurationAvailable(false)
      return saved
    } catch (error) {
      console.error('Push subscribe error:', error)
      return 'failed'
    }
  }, [userId, saveSubscription])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const query = new URLSearchParams({ endpoint: sub.endpoint })
        const res = await fetch(`/api/notifications/push?${query.toString()}`, { method: 'DELETE', headers })
        if (!res.ok) return false
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
      return true
    } catch (error) {
      console.error('Push unsubscribe error:', error)
      return false
    }
  }, [token])

  return { isSubscribed, permission, configurationAvailable, subscribe, unsubscribe }
}
