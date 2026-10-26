import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, verifyPinWithAttempts } from '@/lib/auth'
import { checkChildBalanceLimit } from '@/lib/security'
import { updateBalanceAndNotify } from '@/lib/notifications'
import { findUserByPhone } from '@/lib/phone'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `ussd-transfer:${auth.userId}:${ip}` })
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetIn)

    const body = await request.json()
    const { senderId, receiverPhone, amount, currency, pin } = body

    if (senderId && auth.userId !== senderId) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 })
    }
    if (typeof receiverPhone !== 'string' || receiverPhone.trim().length < 8 || receiverPhone.trim().length > 20 ||
        typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 ||
        !['USD', 'FC'].includes(currency) || typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ success: false, message: 'Numéro, montant, devise ou PIN invalide.' }, { status: 400 })
    }

    const senderIdFromSession = auth.userId
    const sender = await db.user.findUnique({ where: { id: senderIdFromSession } })
    if (!sender) {
      return NextResponse.json({ success: false, message: 'Expéditeur non trouvé' }, { status: 404 })
    }
    if (sender.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Votre compte est temporairement bloqué.' }, { status: 403 })
    }
    if (sender.suspended) {
      return NextResponse.json({ success: false, message: 'Votre compte est suspendu.' }, { status: 403 })
    }

    const pinResult = await verifyPinWithAttempts(sender.id, pin)
    if (!pinResult.valid) {
      return NextResponse.json({
        success: false,
        message: pinResult.blocked ? 'Trop de tentatives. Compte bloqué temporairement.' : `Code PIN incorrect. ${5 - pinResult.attempts} tentative(s) restante(s).`,
      }, { status: pinResult.blocked ? 429 : 401 })
    }

    const receiver = await findUserByPhone(receiverPhone.trim())
    if (!receiver) {
      return NextResponse.json({ success: false, message: 'Aucun compte TRAIT trouvé pour ce numéro' }, { status: 404 })
    }
    if (receiver.id === sender.id) {
      return NextResponse.json({ success: false, message: 'Un transfert vers soi-même est interdit' }, { status: 400 })
    }

    const cur = currency as 'USD' | 'FC'
    const fee = Math.round(amount * 0.007 * 100) / 100
    const limitCheck = await checkChildBalanceLimit(receiver.id, amount, cur)
    if (!limitCheck.allowed) {
      return NextResponse.json({ success: false, message: limitCheck.message }, { status: 400 })
    }

    const senderBalanceField = cur === 'FC' ? 'realBalanceFC' : 'realBalance'
    const receiverBalanceField = cur === 'FC' ? 'realBalanceFC' : 'realBalance'
    let transaction
    try {
      transaction = await db.$transaction(async (tx) => {
        const debit = await tx.user.updateMany({
          where: { id: sender.id, [senderBalanceField]: { gte: amount + fee }, tempBlocked: false, suspended: false },
          data: { [senderBalanceField]: { decrement: amount + fee } },
        })
        if (debit.count !== 1) throw new Error('INSUFFICIENT_BALANCE')

        await tx.user.update({
          where: { id: receiver.id },
          data: { [receiverBalanceField]: { increment: amount } },
        })
        const record = await tx.transaction.create({
          data: {
            type: 'send', amount, fee, currency: cur, status: 'completed',
            senderId: sender.id, receiverId: receiver.id,
            description: `Transfert de ${amount.toFixed(2)} ${cur} via USSD`,
          },
        })
        await tx.notification.createMany({
          data: [
            { userId: receiver.id, title: 'Transfert reçu', message: `Vous avez reçu ${amount.toFixed(2)} ${cur} de ${sender.phone || sender.name || 'Inconnu'}`, type: 'transfer_received' },
            { userId: sender.id, title: 'Transfert envoyé', message: `Vous avez envoyé ${amount.toFixed(2)} ${cur} à ${receiver.phone || receiver.name || 'Inconnu'} via USSD`, type: 'transfer_sent' },
          ],
        })
        return record
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({ success: false, message: `Solde ${cur} insuffisant.` }, { status: 400 })
      }
      throw error
    }

    const [updatedSender, updatedReceiver] = await Promise.all([
      db.user.findUnique({ where: { id: sender.id }, select: { realBalance: true, realBalanceFC: true } }),
      db.user.findUnique({ where: { id: receiver.id }, select: { realBalance: true, realBalanceFC: true } }),
    ])
    updateBalanceAndNotify(sender.id, updatedSender?.realBalance, updatedSender?.realBalanceFC).catch(() => {})
    updateBalanceAndNotify(receiver.id, updatedReceiver?.realBalance, updatedReceiver?.realBalanceFC).catch(() => {})

    const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
    if (sendPushToUser) {
      sendPushToUser(receiver.id, { title: 'Transfert reçu', body: `Vous avez reçu ${amount.toFixed(2)} ${cur} de ${sender.name || sender.phone || 'un utilisateur'}.`, url: '/history' }).catch(() => {})
      sendPushToUser(sender.id, { title: 'Transfert envoyé', body: `Votre transfert de ${amount.toFixed(2)} ${cur} a été envoyé.`, url: '/history' }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      transaction: { id: transaction.id, amount: transaction.amount, fee: transaction.fee, currency: transaction.currency, status: transaction.status, createdAt: transaction.createdAt },
    })
  } catch (error) {
    console.error('USSD transfer error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
