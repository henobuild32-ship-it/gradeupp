'use client'

import { useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export function NotificationBadge({ onClick }: { onClick?: () => void }) {
  const { user, notifications, setNotifications } = useAppStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!user?.id) return

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`)
        const data = await res.json()
        if (data.success && useAppStore.getState().user?.id === user.id) {
          setNotifications(data.notifications || [])
        }
      } catch {}
    }

    fetchNotifications()

    intervalRef.current = setInterval(fetchNotifications, 10000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user?.id])

  return (
    <button
      onClick={onClick}
      className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
