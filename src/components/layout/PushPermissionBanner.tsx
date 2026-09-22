'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'

export function PushPermissionBanner() {
  const { permission, subscribe, isSubscribed } = usePushSubscription()
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(false)

  // Hide only if subscribed or permanently denied
  useEffect(() => {
    if (isSubscribed || permission === 'denied') {
      setDismissed(true)
    }
  }, [isSubscribed, permission])

  // Also hide when permission granted AND subscribed (double check)
  if (dismissed || (permission === 'granted' && isSubscribed)) return null
  // If denied, don't show (can't re-prompt)
  if (permission === 'denied') return null

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-emerald-900">{t('notif.enable_title')}</p>
          <p className="text-xs text-emerald-700 truncate">{t('notif.enable_desc')}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
            onClick={async () => {
              const success = await subscribe()
              if (success) {
                setDismissed(true)
                toast.success(t('settings.notif_success'))
              } else if (Notification.permission === 'denied') {
                toast.error(t('settings.notif_denied'))
              } else {
                toast.info(t('settings.notif_ask'))
              }
            }}
          >
            {t('notif.enable')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-600"
            onClick={() => setDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
