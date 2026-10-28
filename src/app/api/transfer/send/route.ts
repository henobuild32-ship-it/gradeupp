import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import { checkChildBalanceLimit, checkDailyLimit, checkKYC, detectSuspiciousActivity, logSecurityEvent } from '@/lib/security'
import { requireUser, verifyPinWithAttempts } from '@/lib/auth'
import { SendMoneySchema, validateRequest } from '@/lib/validations'
import { updateBalanceAndNotify } from '@/lib/notifications'
import { findUserByPhone } from '@/lib/phone'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { calculateTransferFee, convertCurrencyAmount, DEFAULT_USD_CDF_RATE, normalizeCurrency, roundCurrencyAmount } from '@/lib/currency'
import { getUsdCdfExchangeRate } from '@/lib/currency-server'
import { normalizeInternationalPhone } from '@/lib/countries'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const validation = validateRequest(SendMoneySchema, body)
    if (!validation.success) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 })
    }

    const {
      receiverPhone,
      amount: submittedAmount,
      currency,
      receivingCurrency,
      traitCardTransfer,
      clientRequestId,
      pin,
      description,
    } = validation.data
    const amount = roundCurrencyAmount(submittedAmount)
    if (amount <= 0) {
      return NextResponse.json({ success: false, message: 'Le montant doit être d’au moins 0,01.' }, { status: 400 })
    }
    const senderId = auth.userId
    const normalizedPhone = normalizeInternationalPhone(receiverPhone)
    if (!normalizedPhone) {
      return NextResponse.json({ success: false, message: 'Saisissez un numéro international valide avec son indicatif.' }, { status: 400 })
    }

    const sender = await db.user.findUnique({
      where: { id: senderId },
    })

    if (!sender || sender.deletedAt) {
      return NextResponse.json(
        { success: false, message: 'Expéditeur non trouvé' },
        { status: 404 }
      )
    }

    if (sender.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Votre compte est temporairement bloqué.' }, { status: 403 })
    }

    if (sender.suspended) {
      return NextResponse.json({ success: false, message: 'Votre compte est suspendu.' }, { status: 403 })
    }

    const cur = normalizeCurrency(currency)
    const receiveCur = normalizeCurrency(receivingCurrency || currency)
    const isFC = cur === 'CDF'
    const effectiveDescription = (description?.trim() || `Transfert Trait de ${amount.toFixed(2)} ${cur} vers ${normalizedPhone}`).slice(0, 200)
    const requestFingerprint = clientRequestId
      ? createHash('sha256').update(JSON.stringify({
          receiverPhone: normalizedPhone,
          amount: amount.toFixed(2),
          currency: cur,
          receivingCurrency: receiveCur,
          traitCardTransfer: traitCardTransfer === true,
          description: effectiveDescription,
        })).digest('hex')
      : null

    const findIdempotentTransfer = () => clientRequestId
      ? db.transaction.findUnique({ where: { senderId_clientRequestId: { senderId, clientRequestId } } })
      : Promise.resolve(null)

    const existingTransferResponse = async (existing: any) => {
      if (existing.requestFingerprint !== requestFingerprint) {
        return NextResponse.json({
          success: false,
          code: 'IDEMPOTENCY_KEY_REUSED',
          message: 'Cette référence de demande est déjà associée à un autre transfert.',
        }, { status: 409 })
      }
      const currentBalances = await db.user.findUnique({
        where: { id: senderId },
        select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true },
      })
      return NextResponse.json({
        success: true,
        duplicate: true,
        transaction: {
          id: existing.id,
          type: existing.type,
          amount: existing.amount,
          fee: existing.fee,
          currency: existing.currency,
          receivingCurrency: existing.receivingCurrency,
          amountReceived: existing.amountReceived,
          exchangeRate: existing.exchangeRate,
          status: existing.status,
          senderId: existing.senderId,
          receiverId: existing.receiverId,
          description: existing.description,
          createdAt: existing.createdAt,
        },
        updatedBalances: currentBalances,
      })
    }

    // Return the first result on retries; never debit the same request twice.
    const existingTransfer = await findIdempotentTransfer()
    if (existingTransfer) return existingTransferResponse(existingTransfer)

    const rateLimit = checkRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10, key: `wallet-send:${auth.userId}` })
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetIn)

    if (normalizedPhone === normalizeInternationalPhone(sender.phone)) {
      return NextResponse.json({ success: false, message: 'Un transfert vers soi-même est interdit' }, { status: 400 })
    }

    if (!sender.pin || !pin) {
      return NextResponse.json({ success: false, message: 'PIN requis pour effectuer un transfert' }, { status: 400 })
    }
    const pinResult = await verifyPinWithAttempts(sender.id, pin)
    if (!pinResult.valid) {
      return NextResponse.json({ success: false, message: pinResult.blocked ? 'Trop de tentatives. Compte bloqué temporairement.' : 'PIN incorrect' }, { status: pinResult.blocked ? 429 : 401 })
    }

    const fee = calculateTransferFee(amount)

    // Find receiver — aucun compte n'est créé automatiquement
    const receiver = await findUserByPhone(normalizedPhone)

    if (!receiver) {
      return NextResponse.json(
        { success: false, message: 'Aucun compte TRAIT trouvé pour ce numéro' },
        { status: 404 }
      )
    }

    if (receiver.id === senderId) {
      return NextResponse.json({ success: false, message: 'Un transfert vers soi-même est interdit' }, { status: 400 })
    }
    if (receiver.suspended || receiver.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Le compte du bénéficiaire ne peut pas recevoir de transfert actuellement.' }, { status: 403 })
    }

    if (traitCardTransfer) {
      const [senderCard, receiverCard] = await Promise.all([
        db.traitCard.findFirst({ where: { userId: senderId, status: 'active' }, select: { id: true } }),
        db.traitCard.findFirst({ where: { userId: receiver.id, status: 'active' }, select: { id: true } }),
      ])
      if (!senderCard) return NextResponse.json({ success: false, message: 'Une carte Trait active est nécessaire pour utiliser ce mode de paiement.' }, { status: 403 })
      if (!receiverCard) return NextResponse.json({ success: false, message: 'Aucune carte Trait active n’est liée à ce numéro.' }, { status: 404 })
    }

    const dailyCheck = await checkDailyLimit(senderId)
    if (!dailyCheck.allowed) {
      await logSecurityEvent({ userId: senderId, action: 'daily_limit_reached', details: JSON.stringify({ count: dailyCheck.count, limit: dailyCheck.limit }), riskLevel: 'high' })
      return NextResponse.json({ success: false, message: `Limite journalière atteinte (${dailyCheck.limit} opérations).` }, { status: 429 })
    }

    const exchangeRate = cur === receiveCur ? null : await getUsdCdfExchangeRate()
    const receivedAmount = convertCurrencyAmount(amount, cur, receiveCur, exchangeRate ?? DEFAULT_USD_CDF_RATE)
    const usdEquivalent = cur === 'USD' ? amount : convertCurrencyAmount(amount, 'CDF', 'USD', await getUsdCdfExchangeRate())
    const suspicious = await detectSuspiciousActivity(senderId, usdEquivalent)
    if (suspicious.suspicious) {
      await logSecurityEvent({ userId: senderId, action: 'suspicious_activity', details: JSON.stringify({ reasons: suspicious.reasons, amount, currency: cur }), riskLevel: suspicious.reasons.length >= 2 ? 'critical' : 'medium' })
      if (suspicious.reasons.length >= 2) return NextResponse.json({ success: false, message: 'Opération suspendue pour vérification de sécurité.', code: 'SUSPICIOUS_ACTIVITY' }, { status: 403 })
    }
    if (usdEquivalent > 1000) {
      const kyc = await checkKYC(senderId)
      if (!kyc.verified) return NextResponse.json({ success: false, message: 'Une vérification d’identité validée est requise pour ce montant.', code: 'KYC_REQUIRED', kycStatus: kyc.status }, { status: 403 })
    }

    if (receivedAmount <= 0) {
      return NextResponse.json({ success: false, message: 'Le montant après frais doit rester supérieur à zéro.' }, { status: 400 })
    }
    const limitCheck = await checkChildBalanceLimit(receiver.id, receivedAmount, receiveCur)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, message: limitCheck.message },
        { status: 400 }
      )
    }

    const senderBalanceField = isFC ? 'realBalanceFC' : 'realBalance'
    const senderBonusField = isFC ? 'bonusBalanceFC' : 'bonusBalance'
    const receiverBalanceField = receiveCur === 'CDF' ? 'realBalanceFC' : 'realBalance'

    // Fully atomic: debit + credit + transaction record in a single $transaction
    let transaction
    try {
      const result = await db.$transaction(async (tx) => {
        const canChargeFeeFromBonus = fee > 0 && sender[senderBalanceField] < amount + fee && sender[senderBalanceField] >= amount && sender[senderBonusField] >= fee
        const debit = await tx.user.updateMany({
          where: {
            id: senderId,
            [senderBalanceField]: { gte: canChargeFeeFromBonus ? amount : amount + fee },
            ...(canChargeFeeFromBonus ? { [senderBonusField]: { gte: fee } } : {}),
            suspended: false,
            tempBlocked: false,
            deletedAt: null,
          },
          data: {
            [senderBalanceField]: { decrement: canChargeFeeFromBonus ? amount : amount + fee },
            ...(canChargeFeeFromBonus ? { [senderBonusField]: { decrement: fee } } : {}),
          },
        })
        if (debit.count !== 1) throw new Error('INSUFFICIENT_BALANCE')

        const credit = await tx.user.updateMany({
          where: { id: receiver.id, deletedAt: null, suspended: false, tempBlocked: false },
          data: { [receiverBalanceField]: { increment: receivedAmount } },
        })
        if (credit.count !== 1) throw new Error('RECEIVER_UPDATE_FAILED')

        const txRecord = await tx.transaction.create({
          data: {
            type: 'send',
            amount,
            fee,
            currency: cur,
            receivingCurrency: receiveCur,
            amountReceived: receivedAmount,
            exchangeRate,
            status: 'completed',
            senderId,
            receiverId: receiver.id,
            description: effectiveDescription,
            ...(clientRequestId ? { clientRequestId, requestFingerprint } : {}),
          },
        })

        await tx.notification.create({
          data: {
            userId: receiver.id,
            title: 'Transfert reçu',
            message: `Vous avez reçu ${receivedAmount.toFixed(2)} ${receiveCur} de ${sender.phone || sender.name || 'Inconnu'}`,
            type: 'transfer_received',
          },
        })
        await tx.notification.create({
          data: {
            userId: senderId,
            title: 'Transfert envoyé',
            message: `Vous avez envoyé ${amount.toFixed(2)} ${cur} à ${receiver.phone || receiver.name || 'Inconnu'}${receiveCur !== cur ? ` ; reçu ${receivedAmount.toFixed(2)} ${receiveCur}` : ''}`,
            type: 'transfer_sent',
          },
        })

        return txRecord
      })
      transaction = result
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({ success: false, message: `Solde ${cur} insuffisant` }, { status: 400 })
      }
      if (clientRequestId && typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        const existingAfterRace = await findIdempotentTransfer()
        if (existingAfterRace) return existingTransferResponse(existingAfterRace)
      }
      throw error
    }

    // Send push notification to receiver
    try {
      const { sendPushToUser } = await import('@/lib/push')
      await sendPushToUser(receiver.id, {
        title: 'Transfert reçu',
        body: `Vous avez reçu ${receivedAmount.toFixed(2)} ${receiveCur} de ${sender.name || sender.phone || 'un utilisateur'}`,
        url: '/history',
      })
    } catch (err) {
      console.error('Push notification error:', err)
    }

    // Send push notification to sender confirming transfer
    try {
      const { sendPushToUser } = await import('@/lib/push')
      await sendPushToUser(senderId, {
        title: 'Transfert envoyé',
        body: `Votre transfert de ${amount.toFixed(2)} ${cur} à ${receiver.name || receiver.phone || 'un utilisateur'} a été envoyé avec succès.`,
        url: '/history',
      })
    } catch (err) {
      console.error('Push notification error (sender):', err)
    }

    const updatedSender = await db.user.findUnique({
      where: { id: senderId },
      select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true },
    })

    // Real-time balance update via WebSocket for both sender and receiver
    updateBalanceAndNotify(senderId, updatedSender?.realBalance, updatedSender?.realBalanceFC).catch(() => {})

    const updatedReceiver = await db.user.findUnique({
      where: { id: receiver.id },
      select: { realBalance: true, realBalanceFC: true },
    })
    updateBalanceAndNotify(receiver.id, updatedReceiver?.realBalance, updatedReceiver?.realBalanceFC).catch(() => {})

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        fee: transaction.fee,
        currency: transaction.currency,
        receivingCurrency: transaction.receivingCurrency,
        amountReceived: transaction.amountReceived,
        exchangeRate: transaction.exchangeRate,
        status: transaction.status,
        senderId: transaction.senderId,
        receiverId: transaction.receiverId,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
      updatedBalances: updatedSender,
    })
  } catch (error) {
    console.error('Send transfer error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
