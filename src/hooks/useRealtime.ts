'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || ''

export function useRealtime() {
  const socketRef = useRef<any>(null)
  const { user } = useAppStore()

  useEffect(() => {
    if (!user?.id) return
    if (!SOCKET_URL) return

    let cancelled = false

    const connect = async () => {
      try {
        const { io } = await import('socket.io-client')
        if (cancelled) return

        const socket = io(SOCKET_URL, {
          query: { userId: user.id },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
          timeout: 5000,
        })

        socketRef.current = socket

        socket.on('new_notification', (data: any) => {
          const current = useAppStore.getState().notifications
          useAppStore.getState().setNotifications([data, ...current])
        })

        socket.on('notification_read', (data: { id: string }) => {
          const current = useAppStore.getState().notifications
          useAppStore.getState().setNotifications(
            current.map((n) => (n.id === data.id ? { ...n, read: true } : n))
          )
        })

        socket.on('notifications_read_all', () => {
          const current = useAppStore.getState().notifications
          useAppStore.getState().setNotifications(
            current.map((n) => ({ ...n, read: true }))
          )
        })

        socket.on('balance_update', (data: { realBalance?: number; realBalanceFC?: number }) => {
          const currentUser = useAppStore.getState().user
          if (currentUser && (data.realBalance !== undefined || data.realBalanceFC !== undefined)) {
            useAppStore.getState().setUser({
              ...currentUser,
              ...(data.realBalance !== undefined ? { realBalance: data.realBalance } : {}),
              ...(data.realBalanceFC !== undefined ? { realBalanceFC: data.realBalanceFC } : {}),
            })
          }
        })

        socket.on('new_message', () => {
          window.dispatchEvent(new CustomEvent('new-message'))
        })
      } catch {
        // Socket.IO not available — silently ignore, polling handles notifications
      }
    }

    connect()

    return () => {
      cancelled = true
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [user?.id])

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return { emit }
}
