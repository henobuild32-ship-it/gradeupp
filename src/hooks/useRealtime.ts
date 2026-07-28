'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/lib/store'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || ''

export function useRealtime() {
  const socketRef = useRef<Socket | null>(null)
  const { user } = useAppStore()

  useEffect(() => {
    if (!user?.id) return

    const socketUrl = SOCKET_URL || window.location.origin
    const socket = io(socketUrl, {
      query: { userId: user.id },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[TRAIT Realtime] Connected')
    })

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

    socket.on('disconnect', () => {
      console.log('[TRAIT Realtime] Disconnected')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user?.id])

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return { emit }
}
