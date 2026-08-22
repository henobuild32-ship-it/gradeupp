import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { checkChildBalanceLimit } from '@/lib/security';
import { safeDeductWithFee } from '@/lib/balance';
import { updateBalanceAndNotify } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { senderId, receiverPhone, amount, currency } = body;

    if (auth.userId !== senderId) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 });
    }

    if (!senderId || !receiverPhone || !amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Tous les champs sont requis et le montant doit être positif' }, { status: 400 });
    }

    const sender = await db.user.findUnique({ where: { id: senderId } });
    if (!sender) {
      return NextResponse.json({ success: false, message: 'Expéditeur non trouvé' }, { status: 404 });
    }
    if (sender.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Votre compte est temporairement bloqué.' }, { status: 403 });
    }
    if (sender.suspended) {
      return NextResponse.json({ success: false, message: 'Votre compte est suspendu.' }, { status: 403 });
    }

    const isFC = currency === 'FC';
    const cur = currency || 'USD';
    const fee = Math.round(amount * 0.007 * 100) / 100;

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeductWithFee(senderId, amount, fee, cur);
    if (!deductResult.success) {
      return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 });
    }

    let receiver = await db.user.findUnique({ where: { phone: receiverPhone.trim() } });
    if (receiver) {
      const limitCheck = await checkChildBalanceLimit(receiver.id, amount, cur);
      if (!limitCheck.allowed) {
        // Refund on limit check failure
        await db.user.update({
          where: { id: senderId },
          data: isFC ? { realBalanceFC: { increment: amount + fee } } : { realBalance: { increment: amount + fee } },
        });
        return NextResponse.json({ success: false, message: limitCheck.message }, { status: 400 });
      }
    }
    if (!receiver) {
      receiver = await db.user.create({
        data: {
          phone: receiverPhone.trim(),
          bonusBalance: isFC ? 0 : 10,
          bonusBalanceFC: isFC ? 0 : 0,
          realBalance: 0,
          realBalanceFC: 0,
          country: 'CD',
        },
      });
    }

    const result = await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: receiver.id },
        data: isFC
          ? { realBalanceFC: { increment: amount } }
          : { realBalance: { increment: amount } },
      });
      const transaction = await tx.transaction.create({
        data: {
          type: 'send',
          amount,
          fee,
          currency: cur,
          status: 'completed',
          senderId,
          receiverId: receiver.id,
          description: `Transfert de ${amount.toFixed(2)} ${cur} via USSD`,
        },
      });
      await tx.notification.create({
        data: {
          userId: receiver.id,
          title: 'Transfert reçu',
          message: `Vous avez reçu ${amount.toFixed(2)} ${cur} de ${sender.phone || sender.name || 'Inconnu'}`,
          type: 'transfer_received',
        },
      });
      await tx.notification.create({
        data: {
          userId: senderId,
          title: 'Transfert envoyé',
          message: `Vous avez envoyé ${amount.toFixed(2)} ${cur} à ${receiver.phone || receiver.name || 'Inconnu'} via USSD`,
          type: 'transfer_sent',
        },
      });
      return transaction;
    });

    // Real-time balance update via WebSocket for both sender and receiver
    const updatedSender = await db.user.findUnique({
      where: { id: senderId },
      select: { realBalance: true, realBalanceFC: true },
    })
    updateBalanceAndNotify(senderId, updatedSender?.realBalance, updatedSender?.realBalanceFC).catch(() => {})

    const updatedReceiver = await db.user.findUnique({
      where: { id: receiver.id },
      select: { realBalance: true, realBalanceFC: true },
    })
    updateBalanceAndNotify(receiver.id, updatedReceiver?.realBalance, updatedReceiver?.realBalanceFC).catch(() => {})

    // Push notifications to both parties
    const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
    if (sendPushToUser) {
      sendPushToUser(receiver.id, {
        title: 'Transfert reçu',
        body: `Vous avez reçu ${amount.toFixed(2)} ${cur} de ${sender.name || sender.phone || 'un utilisateur'}.`,
        url: '/history',
      }).catch(() => {})
      sendPushToUser(senderId, {
        title: 'Transfert envoyé',
        body: `Votre transfert de ${amount.toFixed(2)} ${cur} à ${receiver.name || receiver.phone || 'un utilisateur'} a été envoyé.`,
        url: '/history',
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: result.id,
        amount: result.amount,
        fee: result.fee,
        currency: result.currency,
        status: result.status,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    console.error('USSD transfer error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
