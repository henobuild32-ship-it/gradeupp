import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkChildBalanceLimit } from '@/lib/security'
import { requireUser } from '@/lib/auth'
import { SendMoneySchema, validateRequest } from '@/lib/validations'
import { updateBalanceAndNotify } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const validation = validateRequest(SendMoneySchema, body)
    if (!validation.success) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 })
    }

    const { receiverPhone, amount, currency, pin } = validation.data
    const senderId = auth.userId

    const sender = await db.user.findUnique({
      where: { id: senderId },
    })

    if (!sender) {
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

    const isFC = currency === 'FC'
    const cur = isFC ? 'FC' : (currency || 'USD')

    if (receiverPhone.trim() === sender.phone.trim()) {
      return NextResponse.json({ success: false, message: 'Un transfert vers soi-même est interdit' }, { status: 400 })
    }

    if (!sender.pin || !pin) {
      return NextResponse.json({ success: false, message: 'PIN requis pour effectuer un transfert' }, { status: 400 })
    }
    const { verifyAndMigratePin } = await import('@/lib/auth')
    if (!(await verifyAndMigratePin(sender.id, pin, sender.pin))) {
      return NextResponse.json({ success: false, message: 'PIN incorrect' }, { status: 401 })
    }

    const fee = Math.round(amount * 0.007 * 100) / 100

    // Find or create receiver atomically
    let receiver = await db.user.findUnique({
      where: { phone: receiverPhone.trim() },
    })

    if (receiver) {
      const limitCheck = await checkChildBalanceLimit(receiver.id, amount, cur)
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { success: false, message: limitCheck.message },
          { status: 400 }
        )
      }
    }

    if (!receiver) {
      receiver = await db.user.create({
        data: {
          phone: receiverPhone.trim(),
          bonusBalance: isFC ? 0 : 10,
          bonusBalanceFC: 0,
          realBalance: 0,
          realBalanceFC: 0,
          country: 'CD',
        },
      })
    }

    const senderBalanceField = isFC ? 'realBalanceFC' : 'realBalance'
    const receiverBalanceField = isFC ? 'realBalanceFC' : 'realBalance'

    // Fully atomic: debit + credit + transaction record in a single $transaction
    let transaction
    try {
      const result = await db.$transaction(async (tx) => {
        const debit = await tx.user.updateMany({
          where: { id: senderId, [senderBalanceField]: { gte: amount + fee } },
          data: { [senderBalanceField]: { decrement: amount + fee } },
        })
        if (debit.count !== 1) throw new Error('INSUFFICIENT_BALANCE')

        const credit = await tx.user.updateMany({
          where: { id: receiver.id },
          data: { [receiverBalanceField]: { increment: amount } },
        })
        if (credit.count !== 1) throw new Error('RECEIVER_UPDATE_FAILED')

        const txRecord = await tx.transaction.create({
          data: {
            type: 'send',
            amount,
            fee,
            currency: cur,
            status: 'completed',
            senderId,
            receiverId: receiver.id,
            description: `Transfert de ${amount.toFixed(2)} ${cur} vers ${receiver.phone}`,
          },
        })

        await tx.notification.create({
          data: {
            userId: receiver.id,
            title: 'Transfert reçu',
            message: `Vous avez reçu ${amount.toFixed(2)} ${cur} de ${sender.phone || sender.name || 'Inconnu'}`,
            type: 'transfer_received',
          },
        })
        await tx.notification.create({
          data: {
            userId: senderId,
            title: 'Transfert envoyé',
            message: `Vous avez envoyé ${amount.toFixed(2)} ${cur} à ${receiver.phone || receiver.name || 'Inconnu'}`,
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
      throw error
    }

    // Send push notification to receiver
    try {
      const { sendPushToUser } = await import('@/lib/push')
      await sendPushToUser(receiver.id, {
        title: 'Transfert reçu',
        body: `Vous avez reçu ${amount.toFixed(2)} ${cur} de ${sender.name || sender.phone || 'un utilisateur'}`,
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
