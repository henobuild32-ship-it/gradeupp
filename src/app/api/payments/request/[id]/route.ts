import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser, verifyPinWithAttempts } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

const isPaymentError = (error: unknown, code: string) => error instanceof Error && error.message === code
const invoiceNumberFrom = (description: string | null | undefined) => description?.match(/\bFAC-[A-Z0-9]+\b/i)?.[0]?.toUpperCase() ?? null

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `payment-request:${auth.userId}` })
    if (!limit.allowed) return rateLimitResponse(limit.resetIn)

    const { id } = await params
    const body = await request.json().catch(() => ({})) as { action?: unknown; pin?: unknown }
    if (body.action !== 'accept' && body.action !== 'reject') {
      return NextResponse.json({ success: false, message: 'Action invalide. Utilisez "accept" ou "reject".' }, { status: 400 })
    }

    const [paymentRequest, recipient] = await Promise.all([
      prisma.paymentRequest.findUnique({ where: { id } }),
      prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true, phone: true, pin: true, suspended: true, tempBlocked: true } }),
    ])
    if (!paymentRequest) return NextResponse.json({ success: false, message: 'Demande de paiement introuvable' }, { status: 404 })
    if (!recipient || paymentRequest.targetId !== recipient.id || paymentRequest.targetPhone !== recipient.phone) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 })
    }
    if (paymentRequest.status !== 'pending') {
      return NextResponse.json({ success: false, message: 'Cette demande a déjà été traitée' }, { status: 409 })
    }

    if (body.action === 'reject') {
      const rejected = await prisma.paymentRequest.updateMany({
        where: { id, status: 'pending', targetId: recipient.id },
        data: { status: 'rejected' },
      })
      if (rejected.count !== 1) return NextResponse.json({ success: false, message: 'Cette demande a déjà été traitée' }, { status: 409 })
      return NextResponse.json({ success: true, message: 'Demande rejetée' })
    }

    const isQrPayment = paymentRequest.description?.startsWith('Paiement QR — ') ?? false
    if (isQrPayment && Date.now() - paymentRequest.createdAt.getTime() > 5 * 60 * 1000) {
      await prisma.paymentRequest.updateMany({ where: { id, status: 'pending' }, data: { status: 'cancelled' } })
      return NextResponse.json({ success: false, message: 'Cette demande QR a expiré. Demandez au commerçant de la recréer.' }, { status: 410 })
    }
    if (recipient.suspended || recipient.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Votre compte ne peut pas effectuer ce paiement.' }, { status: 403 })
    }
    if (typeof body.pin !== 'string' || !/^\d{4,8}$/.test(body.pin)) {
      return NextResponse.json({ success: false, message: 'Votre code PIN est obligatoire pour confirmer le paiement.' }, { status: 400 })
    }
    if (!recipient.pin) return NextResponse.json({ success: false, message: 'Définissez un code PIN avant d’accepter cette demande.' }, { status: 403 })

    const pinResult = await verifyPinWithAttempts(recipient.id, body.pin)
    if (!pinResult.valid) {
      return NextResponse.json({ success: false, message: pinResult.blocked ? 'Trop de tentatives. Compte temporairement bloqué.' : 'Code PIN incorrect.' }, { status: pinResult.blocked ? 429 : 400 })
    }
    if (!['USD', 'FC'].includes(paymentRequest.currency) || !Number.isFinite(paymentRequest.amount) || paymentRequest.amount <= 0) {
      return NextResponse.json({ success: false, message: 'Montant ou devise de demande invalide.' }, { status: 400 })
    }

    const balanceField = paymentRequest.currency === 'FC' ? 'realBalanceFC' : 'realBalance'
    let transaction: { id: string; amount: number; currency: string; status: string; createdAt: Date }
    try {
      transaction = await prisma.$transaction(async (tx) => {
        const claimed = await tx.paymentRequest.updateMany({
          where: { id, status: 'pending', targetId: recipient.id },
          data: { status: 'completed' },
        })
        if (claimed.count !== 1) throw new Error('PAYMENT_REQUEST_ALREADY_HANDLED')

        const debit = await tx.user.updateMany({
          where: { id: recipient.id, [balanceField]: { gte: paymentRequest.amount }, suspended: false, tempBlocked: false },
          data: { [balanceField]: { decrement: paymentRequest.amount } },
        })
        if (debit.count !== 1) throw new Error('PAYMENT_REQUEST_INSUFFICIENT_BALANCE')

        const credit = await tx.user.updateMany({
          where: { id: paymentRequest.requesterId, suspended: false, tempBlocked: false },
          data: paymentRequest.currency === 'FC'
            ? { realBalanceFC: { increment: paymentRequest.amount } }
            : { realBalance: { increment: paymentRequest.amount } },
        })
        if (credit.count !== 1) throw new Error('PAYMENT_REQUEST_REQUESTER_UNAVAILABLE')

        const created = await tx.transaction.create({
          data: {
            type: 'payment_request',
            amount: paymentRequest.amount,
            fee: 0,
            currency: paymentRequest.currency,
            status: 'completed',
            senderId: recipient.id,
            receiverId: paymentRequest.requesterId,
            description: paymentRequest.description || 'Paiement d’une demande',
          },
          select: { id: true, amount: true, currency: true, status: true, createdAt: true },
        })
        await tx.paymentRequest.update({ where: { id }, data: { transactionId: created.id } })
        await tx.notification.createMany({
          data: [
            { userId: recipient.id, title: 'Paiement confirmé', message: `${paymentRequest.amount.toFixed(2)} ${paymentRequest.currency} envoyé.`, type: 'payment_request' },
            { userId: paymentRequest.requesterId, title: 'Paiement reçu', message: `Demande payée : ${paymentRequest.amount.toFixed(2)} ${paymentRequest.currency}.`, type: 'payment_request' },
          ],
        })
        return created
      })
    } catch (error) {
      if (isPaymentError(error, 'PAYMENT_REQUEST_INSUFFICIENT_BALANCE')) {
        return NextResponse.json({ success: false, message: `Solde ${paymentRequest.currency} insuffisant.` }, { status: 400 })
      }
      if (isPaymentError(error, 'PAYMENT_REQUEST_REQUESTER_UNAVAILABLE')) {
        return NextResponse.json({ success: false, message: 'Le demandeur ne peut pas recevoir ce paiement.' }, { status: 409 })
      }
      if (isPaymentError(error, 'PAYMENT_REQUEST_ALREADY_HANDLED')) {
        return NextResponse.json({ success: false, message: 'Cette demande a déjà été traitée.' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Demande acceptée et payée',
      invoiceNumber: invoiceNumberFrom(paymentRequest.description),
      transaction: { id: transaction.id, amount: transaction.amount, currency: transaction.currency, status: transaction.status, createdAt: transaction.createdAt },
    })
  } catch (error) {
    console.error('Payment request action error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne' }, { status: 500 })
  }
}
