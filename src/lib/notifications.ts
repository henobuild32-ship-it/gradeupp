import { db } from '@/lib/db'
import { sendPushToUser, sendPushToAll } from '@/lib/push'

let ioGetterPromise: Promise<null | (() => any)> | null = null

async function getIoGetter() {
  if (!ioGetterPromise) {
    ioGetterPromise = import('@/lib/realtime-server')
      .then((mod) => mod.getIO)
      .catch(() => null)
  }
  return ioGetterPromise
}

// Try to emit a WebSocket event (works when running the custom server)
async function wsEmit(userId: string, event: string, data: any) {
  try {
    const getIO = await getIoGetter()
    if (!getIO) return
    const io = getIO()
    if (io) io.to(`user:${userId}`).emit(event, data)
  } catch {}
}

async function wsEmitAll(event: string, data: any) {
  try {
    const getIO = await getIoGetter()
    if (!getIO) return
    const io = getIO()
    if (io) io.emit(event, data)
  } catch {}
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'general',
  sendPush: boolean = true
) {
  const notification = await db.notification.create({
    data: { userId, title, message, type },
  })

  void wsEmit(userId, 'new_notification', notification)

  if (sendPush) {
    sendPushToUser(userId, { title, body: message, url: '/notifications' }).catch(() => {})
  }

  return notification
}

export async function createNotificationForUsers(
  userIds: string[],
  title: string,
  message: string,
  type: string = 'general',
  sendPush: boolean = true
) {
  const results = await db.$transaction(
    userIds.map((userId) =>
      db.notification.create({
        data: { userId, title, message, type },
      })
    )
  )

  for (const notif of results) {
    void wsEmit(notif.userId, 'new_notification', notif)
  }

  if (sendPush) {
    for (const userId of userIds) {
      sendPushToUser(userId, { title, body: message, url: '/notifications' }).catch(() => {})
    }
  }

  return results
}

export async function broadcastNotification(
  title: string,
  message: string,
  type: string = 'general',
  sendPush: boolean = true,
  roleFilter?: string
) {
  const where: any = {}
  if (roleFilter) where.role = roleFilter

  const users = await db.user.findMany({
    where,
    select: { id: true },
  })

  const userIds = users.map((u) => u.id)

  const batchSize = 100
  const notifications: any[] = []

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize)
    const created = await db.$transaction(
      batch.map((userId) =>
        db.notification.create({
          data: { userId, title, message, type },
        })
      )
    )
    notifications.push(...created)

    for (const notif of created) {
      void wsEmit(notif.userId, 'new_notification', notif)
    }
  }

  void wsEmitAll('broadcast_notification', { title, message, type })

  if (sendPush) {
    sendPushToAll({ title, body: message, url: '/notifications' }).catch(() => {})
  }

  return { count: notifications.length }
}

export async function createAdminMessageNotification(
  recipientId: string,
  title: string,
  message: string,
  type: string = 'admin_message'
) {
  return createNotification(recipientId, title, message, type, true)
}

export async function updateBalanceAndNotify(
  userId: string,
  realBalance?: number,
  realBalanceFC?: number
) {
  if (realBalance !== undefined || realBalanceFC !== undefined) {
    wsEmit(userId, 'balance_update', { realBalance, realBalanceFC })
  }
}
