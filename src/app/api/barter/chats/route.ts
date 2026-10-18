import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { BARTER_CHAT_TTL_MS } from '@/lib/marketplace'

// GET: list current user's barter conversations (non expired)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const cutoff = new Date(Date.now() - BARTER_CHAT_TTL_MS)

    await db.barterMessage.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {})

    const participations = await db.barterChatParticipant.findMany({
      where: { userId: auth.userId },
      include: {
        chat: {
          include: {
            offer: { select: { id: true, title: true, status: true, category: true } },
            participants: {
              include: { user: { select: { id: true, name: true, pseudo: true } } },
            },
            messages: {
              where: { createdAt: { gt: cutoff } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { chat: { createdAt: 'desc' } },
    })

    const conversations = participations
      .map((p) => {
        const chat = p.chat
        const last = chat.messages[0] || null
        const others = chat.participants.filter((pp) => pp.userId !== auth.userId).map((pp) => pp.user)
        return {
          id: chat.id,
          offerId: chat.offerId,
          offer: chat.offer,
          createdAt: chat.createdAt,
          expiresAt: new Date(new Date(chat.createdAt).getTime() + BARTER_CHAT_TTL_MS),
          others,
          lastMessage: last
            ? {
                id: last.id,
                senderId: last.senderId,
                content: last.content,
                hasImage: !!last.image,
                createdAt: last.createdAt,
              }
            : null,
        }
      })
      .filter((c) => new Date(c.createdAt).getTime() > Date.now() - BARTER_CHAT_TTL_MS)
      .sort((a, b) => {
        const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime()
        const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime()
        return bt - at
      })

    const unreadPerChat = await db.barterMessage.groupBy({
      by: ['chatId'],
      where: {
        readAt: null,
        createdAt: { gt: cutoff },
        senderId: { not: auth.userId },
        chat: { participants: { some: { userId: auth.userId } } },
      },
      _count: { _all: true },
    })
    const unreadMap = new Map(unreadPerChat.map((u) => [u.chatId, u._count._all]))

    return NextResponse.json({
      success: true,
      conversations: conversations.map((c) => ({
        ...c,
        unreadCount: unreadMap.get(c.id) || 0,
      })),
    })
  } catch (error) {
    console.error('List barter chats error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
