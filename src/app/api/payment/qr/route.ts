import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAndMigratePin, requireUser } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { QRPaymentSchema, validateRequest } from '@/lib/validations'
import { safeDeductWithFee } from '@/lib/balance'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    // Rate limit: 10 payments per minute per user
    const rateLimit = checkRateLimit({
      windowMs: 60 * 1000,
      maxRequests: 10,
      key: `qr:${auth.userId}`,
    })
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn)
    }

    const body = await request.json()
    const validation = validateRequest(QRPaymentSchema, body)
    if (!validation.success) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 })
    }

    const { sellerId, qrCode, amount: payAmount, currency, pin } = validation.data

    // Verify Seller
    const seller = await db.user.findUnique({ where: { id: sellerId } })
    if (!seller || seller.role !== 'seller' || seller.validationStatus !== 'validated') {
      return NextResponse.json({ success: false, message: 'Service non autorisé' }, { status: 403 })
    }

    // Verify Client via QR Code
    const traitCard = await db.traitCard.findFirst({
      where: { qrCode, status: 'active' },
      include: { user: true }
    })

    if (!traitCard || !traitCard.user) {
      return NextResponse.json({ success: false, message: 'Carte invalide' }, { status: 400 })
    }

    const client = traitCard.user
    
    // Prevent self-payment
    if (client.id === seller.id) {
      return NextResponse.json({ success: false, message: 'Vous ne pouvez pas payer vous-même' }, { status: 400 })
    }

    const isUSD = (currency || 'USD') === 'USD'

    const isChild = client.parentId !== null
    if (isChild) {
      if (!pin) {
        return NextResponse.json({
          success: false,
          requirePin: true,
          message: "Le code PIN de l'enfant est obligatoire pour valider cet achat."
        }, { status: 400 })
      }
      const pinOk = await verifyAndMigratePin(client.id, pin, client.pin)
      if (!pinOk) {
        return NextResponse.json({
          success: false,
          message: "Code PIN de l'enfant incorrect."
        }, { status: 400 })
      }
    }
    const fee = isChild ? Math.round(payAmount * 0.007 * 100) / 100 : 0

    // Atomic balance check + deduction (race-condition safe)
    const cur = currency || 'USD'
    const deductResult = await safeDeductWithFee(client.id, payAmount, fee, cur)
    if (!deductResult.success) {
      return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 })
    }

    // Credit seller and record
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: seller.id },
        data: isUSD ? { realBalance: { increment: payAmount } } : { realBalanceFC: { increment: payAmount } }
      })

      await tx.transaction.create({
        data: {
          type: 'qr_payment',
          amount: payAmount,
          fee,
          currency: cur,
          status: 'completed',
          senderId: client.id,
          receiverId: seller.id,
          description: `Paiement QR chez ${seller.businessName || 'Service'}${isChild ? ` (Commission Enfant: ${fee} ${cur})` : ''}`,
        }
      })

      await tx.notification.create({
        data: {
          userId: seller.id,
          title: 'Paiement reçu',
          message: `Paiement de ${payAmount.toFixed(2)} ${cur} reçu via QR code.`,
          type: 'transfer_received',
        },
      })
    })

    return NextResponse.json({ success: true, message: 'Paiement réussi' })
  } catch (error) {
    console.error('QR Payment error:', error)
    return NextResponse.json({ success: false, message: 'Erreur lors du paiement' }, { status: 500 })
  }
}
