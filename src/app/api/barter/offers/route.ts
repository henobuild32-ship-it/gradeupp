import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// GET: List barter offers
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const where: Record<string, unknown> = {}
    if (status && ['active', 'accepted', 'rejected', 'cancelled'].includes(status)) {
      where.status = status
    } else {
      where.status = { in: ['active', 'accepted'] }
    }

    const offers = await db.barterOffer.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, pseudo: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      offers: offers.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        category: o.category,
        offeredBy: o.offeredBy,
        wantedItem: o.wantedItem,
        images: o.images,
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        user: o.user,
      })),
    })
  } catch (error) {
    console.error('Get barter offers error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create new barter offer
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const body = await request.json()
    const { title, description, category, offeredBy, wantedItem } = body as {
      title: string
      description: string
      category: string
      offeredBy: string
      wantedItem?: string
    }

    if (!title || !description || !category || !offeredBy) {
      return NextResponse.json(
        { success: false, message: 'Title, description, category, and offeredBy are required' },
        { status: 400 }
      )
    }

    if (auth.userId !== offeredBy) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: offeredBy },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const offer = await db.barterOffer.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        offeredBy,
        wantedItem: wantedItem?.trim() || null,
      },
    })

    return NextResponse.json({
      success: true,
      offer: {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        category: offer.category,
        offeredBy: offer.offeredBy,
        wantedItem: offer.wantedItem,
        images: offer.images,
        status: offer.status,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
      },
    })
  } catch (error) {
    console.error('Create barter offer error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: accept | reject | cancel an offer (owner only)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { offerId, action } = body as { offerId?: string; action?: 'accept' | 'reject' | 'cancel' }

    if (!offerId || !action || !['accept', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Action invalide' }, { status: 400 })
    }

    const offer = await db.barterOffer.findUnique({ where: { id: offerId } })
    if (!offer) {
      return NextResponse.json({ success: false, message: 'Offre introuvable' }, { status: 404 })
    }

    if (offer.offeredBy !== auth.userId) {
      return NextResponse.json({ success: false, message: 'Seul le propriétaire peut modifier cette offre' }, { status: 403 })
    }

    if (offer.status !== 'active') {
      return NextResponse.json({ success: false, message: 'Offre déjà traitée' }, { status: 409 })
    }

    const newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'cancelled'
    const updated = await db.barterOffer.update({
      where: { id: offerId },
      data: { status: newStatus },
    })

    if (action !== 'cancel') {
      const chats = await db.barterChat.findMany({
        where: { offerId },
        include: { participants: true },
      })
      for (const chat of chats) {
        for (const p of chat.participants) {
          if (p.userId === auth.userId) continue
          await db.notification.create({
            data: {
              userId: p.userId,
              title: action === 'accept' ? 'Échange accepté' : 'Échange refusé',
              message: `L'offre "${offer.title}" a été ${action === 'accept' ? 'acceptée' : 'refusée'}.`,
              type: action === 'accept' ? 'barter_accepted' : 'barter_rejected',
            },
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({ success: true, offer: updated })
  } catch (error) {
    console.error('Barter status update error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
