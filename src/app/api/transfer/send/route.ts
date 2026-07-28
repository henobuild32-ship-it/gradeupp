import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkChildBalanceLimit } from '@/lib/security'
import { requireUser } from '@/lib/auth'
import { SendMoneySchema, validateRequest } from '@/lib/validations'
import { safeDeductWithFee } from '@/lib/balance'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const validation = validateRequest(SendMoneySchema, body)
    if (!validation.success) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 })
    }

    const { receiverPhone, amount, currency } = validation.data
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

    const fee = Math.round(amount * 0.007 * 100) / 100

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeductWithFee(senderId, amount, fee, cur)
    if (!deductResult.success) {
      return NextResponse.json(
        { success: false, message: deductResult.message },
        { status: 400 }
      )
    }

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

    // Atomic transaction: credit receiver, create tx record, notify
    const [transaction] = await db.$transaction([
      db.transaction.create({
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
      }),
      db.user.update({
        where: { id: receiver.id },
        data: isFC
          ? { realBalanceFC: { increment: amount } }
          : { realBalance: { increment: amount } },
      }),
      db.notification.create({
        data: {
          userId: receiver.id,
          title: 'Transfert reçu',
          message: `Vous avez reçu ${amount.toFixed(2)} ${cur} de ${sender.phone || sender.name || 'Inconnu'}`,
          type: 'transfer_received',
        },
      }),
    ])

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

    const updatedSender = await db.user.findUnique({
      where: { id: senderId },
      select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true },
    })

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
