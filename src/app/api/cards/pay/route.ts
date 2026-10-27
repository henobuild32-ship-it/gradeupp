import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, verifyPinWithAttempts } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const userId = auth.userId;
    const rateLimit = checkRateLimit({ windowMs: 60_000, maxRequests: 8, key: `card-pay:${userId}` });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetIn);

    const body = await request.json() as {
      cardId?: unknown; amount?: unknown; currency?: unknown; description?: unknown; pin?: unknown;
    };
    const { cardId, amount, currency, description, pin } = body;
    if (typeof cardId !== 'string' || !cardId || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      return NextResponse.json({ success: false, message: 'Carte et montant valide requis' }, { status: 400 });
    }
    if (currency !== 'USD' && currency !== 'FC') {
      return NextResponse.json({ success: false, message: 'Devise invalide' }, { status: 400 });
    }
    if (typeof description === 'string' && description.length > 200) {
      return NextResponse.json({ success: false, message: 'Description trop longue' }, { status: 400 });
    }
    if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ success: false, message: 'Votre code PIN à 4 à 8 chiffres est obligatoire.' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
    if (user.suspended || user.tempBlocked) {
      return NextResponse.json({ success: false, message: user.suspended ? 'Votre compte est suspendu' : 'Votre compte est temporairement bloqué' }, { status: 403 });
    }
    if (!user.pin) return NextResponse.json({ success: false, message: 'Définissez un code PIN avant de payer.' }, { status: 403 });

    const pinResult = await verifyPinWithAttempts(userId, pin);
    if (!pinResult.valid) {
      return NextResponse.json({ success: false, message: pinResult.blocked ? 'Trop de tentatives. Compte bloqué temporairement.' : 'Code PIN incorrect.' }, { status: pinResult.blocked ? 429 : 400 });
    }

    const card = await db.traitCard.findUnique({ where: { id: cardId } });
    if (!card) return NextResponse.json({ success: false, message: 'Carte non trouvée' }, { status: 404 });
    if (card.userId !== userId) return NextResponse.json({ success: false, message: 'Cette carte ne vous appartient pas' }, { status: 403 });
    if (card.status !== 'active') return NextResponse.json({ success: false, message: `Cette carte est ${card.status}. Seules les cartes actives peuvent être utilisées.` }, { status: 400 });
    if (card.cardType !== currency) return NextResponse.json({ success: false, message: `Cette carte est de type ${card.cardType}, mais vous essayez de payer en ${currency}` }, { status: 400 });

    const isChild = user.parentId !== null;
    const fee = isChild ? Math.round(amount * 0.007 * 100) / 100 : 0;
    const balanceField = currency === 'FC' ? 'realBalanceFC' : 'realBalance';
    const bonusField = currency === 'FC' ? 'bonusBalanceFC' : 'bonusBalance';
    const balance = currency === 'FC' ? user.realBalanceFC : user.realBalance;
    const bonusBalance = currency === 'FC' ? user.bonusBalanceFC : user.bonusBalance;
    const total = amount + fee;
    const chargeBonus = balance < total && fee > 0 && balance >= amount && bonusBalance >= fee;
    if (balance < total && !chargeBonus) {
      return NextResponse.json({ success: false, message: `Solde ${currency} insuffisant.` }, { status: 400 });
    }

    const last4 = card.last4 || '';
    const paymentDesc = typeof description === 'string' && description.trim()
      ? description.trim()
      : `Paiement par carte TRAIT - ****${last4}${isChild ? ` (Commission Enfant: ${fee} ${currency})` : ''}`;

    const payment = await db.$transaction(async (tx) => {
      const debit = await tx.user.updateMany({
        where: {
          id: userId,
          [balanceField]: { gte: chargeBonus ? amount : total },
          ...(chargeBonus ? { [bonusField]: { gte: fee } } : {}),
          tempBlocked: false,
          suspended: false,
        },
        data: {
          [balanceField]: { decrement: chargeBonus ? amount : total },
          ...(chargeBonus ? { [bonusField]: { decrement: fee } } : {}),
        },
      });
      if (debit.count !== 1) return null;

      const cardPayment = await tx.cardPayment.create({
        data: { cardId, userId, amount, currency, description: paymentDesc, status: 'completed' },
      });
      await tx.transaction.create({
        data: { type: 'card_payment', amount, fee, currency, status: 'completed', senderId: userId, receiverId: userId, description: paymentDesc },
      });
      await tx.notification.create({
        data: {
          userId,
          title: 'Paiement par carte effectué',
          message: `Paiement de ${amount.toFixed(2)} ${currency} effectué avec votre carte TRAIT se terminant par ${last4}.`,
          type: 'card_payment',
        },
      });
      return cardPayment;
    });

    if (!payment) return NextResponse.json({ success: false, message: 'Solde insuffisant ou compte bloqué. Réessayez.' }, { status: 409 });

    const updatedBalances = await db.user.findUnique({
      where: { id: userId },
      select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true },
    });
    return NextResponse.json({
      success: true,
      message: 'Paiement effectué avec succès',
      payment: { id: payment.id, amount: payment.amount, currency: payment.currency, description: payment.description, status: payment.status, createdAt: payment.createdAt },
      updatedBalances,
    });
  } catch (error) {
    console.error('Card payment error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
