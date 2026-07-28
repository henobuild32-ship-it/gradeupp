import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { safeDeduct } from '@/lib/balance';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { userId, network, phoneNumber, amount, currency } = body;

    if (auth.userId !== userId) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 });
    }

    if (!userId || !network || !phoneNumber || !amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Tous les champs sont requis' }, { status: 400 });
    }

    const validNetworks = ['Vodacom', 'Airtel', 'Orange', 'Africell'];
    if (!validNetworks.includes(network)) {
      return NextResponse.json({ success: false, message: 'Réseau non valide' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
    }
    if (user.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Votre compte est temporairement bloqué.' }, { status: 403 });
    }

    const isFC = currency === 'FC';
    const cur = currency || 'USD';

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeduct(userId, amount, cur);
    if (!deductResult.success) {
      return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const credit = await tx.creditPurchase.create({
        data: {
          userId,
          network,
          phoneNumber: phoneNumber.trim(),
          amount,
          currency: cur,
          status: 'completed',
        },
      });
      await tx.notification.create({
        data: {
          userId,
          title: 'Achat de crédit',
          message: `Achat de ${amount.toFixed(2)} ${cur} de crédit ${network} pour ${phoneNumber}`,
          type: 'purchase',
        },
      });
      return credit;
    });

    return NextResponse.json({
      success: true,
      creditPurchase: {
        id: result.id,
        network: result.network,
        phoneNumber: result.phoneNumber,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
      },
    });
  } catch (error) {
    console.error('USSD credit purchase error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
