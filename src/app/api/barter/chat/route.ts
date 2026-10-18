import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { BARTER_CHAT_TTL_MS } from '@/lib/marketplace'

const MAX_MESSAGE_IMAGE_LENGTH = 400_000

function isBlockedBetween(a: string, b: string) {
  return db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  })
}

async function purgeExpiredMessages() {
  const cutoff = new Date(Date.now() - BARTER_CHAT_TTL_MS)
  await db.barterMessage.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {})
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const body = await request.json()
    const { chatId, offerId, initiatedBy, senderId, content, image } = body as {
      chatId?: string
      offerId?: string
      initiatedBy?: string
      senderId?: string
      content?: string
      image?: string
    }

    // Case 1: Create or get chat for an offer
    if (offerId && initiatedBy && !content && !image) {
      if (auth.userId !== initiatedBy) {
        return NextResponse.json(
          { success: false, message: 'Non autorisé' },
          { status: 403 }
        )
      }
      const offer = await db.barterOffer.findUnique({
        where: { id: offerId },
      })

      if (!offer) {
        return NextResponse.json(
          { success: false, message: 'Offre introuvable' },
          { status: 404 }
        )
      }

      const blocked = await isBlockedBetween(auth.userId, offer.offeredBy)
      if (blocked) {
        return NextResponse.json(
          { success: false, message: 'Impossible de démarrer cette conversation' },
          { status: 403 }
        )
      }

      // Check if a chat already exists between the initiator and the offer creator
      const existingChat = await db.barterChat.findFirst({
        where: {
          offerId,
          initiatedBy,
        },
      })

      if (existingChat) {
        return NextResponse.json({
          success: true,
          chat: {
            id: existingChat.id,
            offerId: existingChat.offerId,
            initiatedBy: existingChat.initiatedBy,
            createdAt: existingChat.createdAt,
            expiresAt: new Date(new Date(existingChat.createdAt).getTime() + BARTER_CHAT_TTL_MS),
          },
        })
      }

      // Create new chat
      const chat = await db.barterChat.create({
        data: {
          offerId,
          initiatedBy,
        },
      })

      // Add both participants
      await db.barterChatParticipant.createMany({
        data: [
          { chatId: chat.id, userId: initiatedBy },
          { chatId: chat.id, userId: offer.offeredBy },
        ],
        skipDuplicates: true,
      })

      // Notify the offer owner
      await db.notification.create({
        data: {
          userId: offer.offeredBy,
          title: 'Nouvelle discussion Troc',
          message: `Un utilisateur a démarré une discussion sur votre offre « ${offer.title} ». Disponible pendant 48 h.`,
          type: 'barter_accepted',
        },
      }).catch(() => {})

      const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
      if (sendPushToUser) {
        sendPushToUser(offer.offeredBy, {
          title: 'Nouvelle discussion Troc',
          body: `Un utilisateur a démarré une discussion sur « ${offer.title} ».`,
          url: '/barter',
        }).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        chat: {
          id: chat.id,
          offerId: chat.offerId,
          initiatedBy: chat.initiatedBy,
          createdAt: chat.createdAt,
          expiresAt: new Date(new Date(chat.createdAt).getTime() + BARTER_CHAT_TTL_MS),
        },
      })
    }

    // Case 2: Send message to a chat
    if (chatId && senderId && (content || image)) {
      if (auth.userId !== senderId) {
        return NextResponse.json(
          { success: false, message: 'Non autorisé' },
          { status: 403 }
        )
      }

      if (image && (typeof image !== 'string' || !image.startsWith('data:image/') || image.length > MAX_MESSAGE_IMAGE_LENGTH)) {
        return NextResponse.json(
          { success: false, message: 'Photo invalide ou trop volumineuse' },
          { status: 400 }
        )
      }

      if (!image && (!content || !content.trim())) {
        return NextResponse.json(
          { success: false, message: 'Message vide' },
          { status: 400 }
        )
      }

      const chat = await db.barterChat.findUnique({
        where: { id: chatId },
        include: { participants: true, offer: true },
      })

      if (!chat) {
        return NextResponse.json(
          { success: false, message: 'Chat not found' },
          { status: 404 }
        )
      }

      const isParticipant = chat.participants.some((p) => p.userId === senderId)
      if (!isParticipant) {
        return NextResponse.json(
          { success: false, message: 'Non autorisé' },
          { status: 403 }
        )
      }

      const expired = new Date(chat.createdAt).getTime() + BARTER_CHAT_TTL_MS < Date.now()
      if (expired) {
        return NextResponse.json(
          { success: false, message: 'Cette conversation a expiré (48 h)' },
          { status: 410 }
        )
      }

      const others = chat.participants.filter((p) => p.userId !== senderId)
      for (const other of others) {
        const blocked = await isBlockedBetween(senderId, other.userId)
        if (blocked) {
          return NextResponse.json(
            { success: false, message: 'Impossible d\'envoyer un message à cet utilisateur' },
            { status: 403 }
          )
        }
      }

      const message = await db.barterMessage.create({
        data: {
          chatId,
          senderId,
          content: content ? content.trim() : '',
          image: image || null,
        },
      })

      for (const other of others) {
        await db.notification.create({
          data: {
            userId: other.userId,
            title: 'Nouveau message Troc',
            message: image && !content
              ? `Photo reçue dans « ${chat.offer.title} »`
              : `Nouveau message dans « ${chat.offer.title} »`,
            type: 'barter_message',
          },
        }).catch(() => {})
        const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
        if (sendPushToUser) {
          sendPushToUser(other.userId, {
            title: 'Nouveau message Troc',
            body: image && !content ? 'Photo reçue' : (content || '').slice(0, 80),
            url: '/barter',
          }).catch(() => {})
        }
      }

      return NextResponse.json({
        success: true,
        message: {
          id: message.id,
          chatId: message.chatId,
          senderId: message.senderId,
          content: message.content,
          image: message.image,
          readAt: message.readAt,
          createdAt: message.createdAt,
        },
      })
    }

    return NextResponse.json(
      { success: false, message: 'Invalid request. Provide offerId+initiatedBy to create chat, or chatId+senderId+content to send message.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Barter chat POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: Get messages for a chat (participants only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')

    if (!chatId) {
      return NextResponse.json(
        { success: false, message: 'Chat ID is required' },
        { status: 400 }
      )
    }

    const participation = await db.barterChatParticipant.findFirst({
      where: { chatId, userId: auth.userId },
    })
    if (!participation) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      )
    }

    await purgeExpiredMessages()

    await db.barterMessage.updateMany({
      where: { chatId, senderId: { not: auth.userId }, readAt: null },
      data: { readAt: new Date() },
    })

    const chat = await db.barterChat.findUnique({
      where: { id: chatId },
      include: {
        offer: { select: { id: true, title: true, status: true } },
        participants: {
          include: { user: { select: { id: true, name: true, pseudo: true } } },
        },
      },
    })

    const cutoff = new Date(Date.now() - BARTER_CHAT_TTL_MS)
    const messages = await db.barterMessage.findMany({
      where: { chatId, createdAt: { gt: cutoff } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      chat: chat
        ? {
            id: chat.id,
            offerId: chat.offerId,
            createdAt: chat.createdAt,
            expiresAt: new Date(new Date(chat.createdAt).getTime() + BARTER_CHAT_TTL_MS),
            offer: chat.offer,
            participants: chat.participants.map((p) => p.user),
          }
        : null,
      messages: messages.map((m) => ({
        id: m.id,
        chatId: m.chatId,
        senderId: m.senderId,
        content: m.content,
        image: m.image,
        readAt: m.readAt,
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get chat messages error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
