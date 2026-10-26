import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { QRPaymentSchema, validateRequest } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rateLimit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `qr:${auth.userId}` })
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetIn)

    const validation = validateRequest(QRPaymentSchema, await request.json())
    if (!validation.success) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 })
    }
    const { sellerId, qrCode, amount, currency = 'USD' } = validation.data
    if (!Number.isFinite(amount) || amount > 1_000_000) {
      return NextResponse.json({ success: false, message: 'Montant invalide ou supérieur à la limite autorisée.' }, { status: 400 })
    }
    if (auth.userId !== sellerId) return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 })

    const seller = await db.user.findUnique({ where: { id: sellerId } })
    if (!seller || seller.role !== 'seller' || seller.validationStatus !== 'validated' || seller.suspended || seller.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Service non autorisé' }, { status: 403 })
    }

    const card = await db.traitCard.findFirst({ where: { qrCode, status: 'active' }, include: { user: true } })
    if (!card?.user) return NextResponse.json({ success: false, message: 'Carte invalide' }, { status: 400 })

    const client = card.user
    if (client.id === seller.id) return NextResponse.json({ success: false, message: 'Vous ne pouvez pas payer votre propre compte.' }, { status: 400 })
    if (client.suspended || client.tempBlocked) return NextResponse.json({ success: false, message: 'Le compte client ne peut pas recevoir cette demande.' }, { status: 403 })

    // Le commerçant peut demander un montant, mais seul le client peut l’autoriser et être débité.
    const paymentRequest = await db.paymentRequest.create({
      data: {
        requesterId: seller.id,
        targetId: client.id,
        targetPhone: client.phone,
        amount,
        currency,
        description: `Paiement QR — ${seller.businessName || 'Commerçant'}`,
      },
      select: { id: true },
    })
    await db.notification.create({
      data: {
        userId: client.id,
        title: 'Demande de paiement QR',
        message: `${seller.businessName || 'Un commerçant'} demande ${amount.toFixed(2)} ${currency}. Ouvrez Demandes de paiement pour accepter ou refuser.`,
        type: 'payment_request',
      },
    })
    try {
      const { sendPushToUser } = await import('@/lib/push')
      await sendPushToUser(client.id, {
        title: 'Demande de paiement QR',
        body: `${seller.businessName || 'Un commerçant'} demande ${amount.toFixed(2)} ${currency}.`,
        url: '/history',
      })
    } catch {}

    return NextResponse.json({
      success: true,
      pendingApproval: true,
      requestId: paymentRequest.id,
      message: 'Demande envoyée. Le client doit la confirmer depuis son compte.',
    }, { status: 201 })
  } catch (error) {
    console.error('QR payment request error:', error)
    return NextResponse.json({ success: false, message: 'Erreur lors de la demande de paiement' }, { status: 500 })
  }
}
