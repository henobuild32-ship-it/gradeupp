import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, verifyAndMigratePin } from '@/lib/auth';
import { safeDeductWithFee } from '@/lib/balance';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { cardId, amount, currency, description, pin } = await request.json() as {
      cardId: string;
      amount: number;
      currency: string;
      description?: string;
      pin?: string;
    };

    const userId = auth.userId

    if (!cardId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants: cardId, montant positif requis' },
        { status: 400 }
      );
    }

    if (!currency || !['USD', 'FC'].includes(currency)) {
      return NextResponse.json(
        { success: false, message: 'currency doit être "USD" ou "FC"' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    if (user.suspended) {
      return NextResponse.json(
        { success: false, message: 'Votre compte est suspendu' },
        { status: 403 }
      );
    }

    if (user.tempBlocked) {
      return NextResponse.json(
        { success: false, message: 'Votre compte est temporairement bloqué' },
        { status: 403 }
      );
    }

    const card = await db.traitCard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, message: 'Carte non trouvée' },
        { status: 404 }
      );
    }

    if (card.userId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Cette carte ne vous appartient pas' },
        { status: 403 }
      );
    }

    if (card.status !== 'active') {
      return NextResponse.json(
        { success: false, message: `Cette carte est ${card.status}. Seules les cartes actives peuvent être utilisées.` },
        { status: 400 }
      );
    }

    if (card.cardType !== currency) {
      return NextResponse.json(
        { success: false, message: `Cette carte est de type ${card.cardType}, mais vous essayez de payer en ${currency}` },
        { status: 400 }
      );
    }

    const isFC = currency === 'FC';

    const isChild = user.parentId !== null;

    if (isChild) {
      if (!pin) {
        return NextResponse.json(
          { success: false, message: "Le code PIN est obligatoire pour valider l'achat." },
          { status: 400 }
        );
      }
      if (!user.pin) {
        return NextResponse.json(
          { success: false, message: 'Aucun PIN défini.' },
          { status: 400 }
        );
      }
      const pinValid = user.pin.startsWith('$2')
        ? await (await import('bcryptjs')).compare(pin, user.pin)
        : await verifyAndMigratePin(userId, pin, user.pin)

      if (!pinValid) {
        return NextResponse.json(
          { success: false, message: "Code PIN de l'enfant incorrect." },
          { status: 400 }
        );
      }
    }

    const fee = isChild ? Math.round(amount * 0.007 * 100) / 100 : 0;

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeductWithFee(userId, amount, fee, currency);
    if (!deductResult.success) {
      return NextResponse.json(
        { success: false, message: deductResult.message },
        { status: 400 }
      );
    }

    const paymentDesc = description || `Paiement par carte ${card.cardNumber}${isChild ? ` (Commission Enfant: ${fee} ${currency})` : ''}`;

    // Create records
    const [cardPayment] = await db.$transaction([
      db.cardPayment.create({
        data: {
          cardId,
          userId,
          amount,
          currency,
          description: paymentDesc,
          status: 'completed',
        },
      }),
      db.transaction.create({
        data: {
          type: 'card_payment',
          amount,
          fee,
          currency,
          status: 'completed',
          senderId: userId,
          receiverId: userId,
          description: description || `Paiement par carte TRAIT - ${String(card.cardNumber).slice(-4)}${isChild ? ` (Commission Enfant: ${fee} ${currency})` : ''}`,
        },
      }),
      db.notification.create({
        data: {
          userId,
          title: 'Paiement par carte effectué',
          message: `Paiement de ${amount.toFixed(2)} ${currency} effectué avec votre carte TRAIT se terminant par ${String(card.cardNumber).slice(-4)}.`,
          type: 'card_payment',
        },
      }),
    ]);

    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Paiement effectué avec succès',
      payment: {
        id: cardPayment.id,
        amount: cardPayment.amount,
        currency: cardPayment.currency,
        description: cardPayment.description,
        status: cardPayment.status,
        createdAt: cardPayment.createdAt,
      },
      updatedBalances: updatedUser,
    });
  } catch (error) {
    console.error('Card payment error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
