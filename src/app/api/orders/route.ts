import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

const ORDER_STATUSES = ['pending', 'paid', 'confirmed', 'preparing', 'completed', 'cancelled'] as const

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || 'buyer'
    const status = searchParams.get('status')

    const where: Record<string, unknown> =
      role === 'seller' ? { sellerId: auth.userId } : { buyerId: auth.userId }

    if (status && ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
      where.status = status
    }

    const orders = await db.order.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, imageUrl: true, category: true, qrCode: true } },
        buyer: { select: { id: true, name: true, pseudo: true, phone: true } },
        seller: { select: { id: true, name: true, pseudo: true, phone: true, businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error('List orders error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { orderId, status } = body as { orderId?: string; status?: string }

    if (!orderId || !status || !ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
      return NextResponse.json({ success: false, message: 'Statut invalide' }, { status: 400 })
    }

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json({ success: false, message: 'Commande introuvable' }, { status: 404 })
    }

    const isSeller = order.sellerId === auth.userId
    const isBuyer = order.buyerId === auth.userId
    if (!isSeller && !isBuyer) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 })
    }

    // Buyer can only cancel while pending/paid
    if (isBuyer && !isSeller) {
      if (status !== 'cancelled' || !['pending', 'paid'].includes(order.status)) {
        return NextResponse.json({ success: false, message: 'Action non autorisée' }, { status: 403 })
      }
    }

    // Seller cannot cancel with buyer-only rights path — sellers can update fulfillment statuses
    if (isSeller && !isBuyer) {
      const allowed = ['confirmed', 'preparing', 'completed', 'cancelled']
      if (!allowed.includes(status)) {
        return NextResponse.json({ success: false, message: 'Statut non autorisé' }, { status: 403 })
      }
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: { status },
    })

    if (status === 'cancelled' && order.status !== 'cancelled') {
      // Restore stock
      await db.marketplaceProduct.update({
        where: { id: order.productId },
        data: { stock: { increment: order.quantity } },
      }).catch(() => {})
    }

    const notifyId = isSeller ? order.buyerId : order.sellerId
    await db.notification.create({
      data: {
        userId: notifyId,
        title: 'Commande mise à jour',
        message: `Commande #${order.id.slice(-6)} → ${status}`,
        type: 'order',
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, order: updated })
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
