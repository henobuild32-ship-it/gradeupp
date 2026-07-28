import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { safeDeduct } from '@/lib/balance';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { userId, billType, reference, amount, currency } = body;

    if (auth.userId !== userId) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 });
    }

    if (!userId || !billType || !reference || !amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Tous les champs sont requis' }, { status: 400 });
    }

    const validTypes = ['electricity', 'water', 'internet', 'subscription', 'other'];
    if (!validTypes.includes(billType)) {
      return NextResponse.json({ success: false, message: 'Type de facture non valide' }, { status: 400 });
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
      const billPayment = await tx.billPayment.create({
        data: {
          userId,
          billType,
          reference: reference.trim(),
          amount,
          currency: cur,
          status: 'completed',
        },
      });
      const typeLabels: Record<string, string> = {
        electricity: 'Électricité',
        water: 'Eau',
        internet: 'Internet',
        subscription: 'Abonnement',
        other: 'Autre',
      };
      await tx.notification.create({
        data: {
          userId,
          title: 'Paiement de facture',
          message: `Paiement de ${amount.toFixed(2)} ${cur} pour ${typeLabels[billType] || billType} (Réf: ${reference})`,
          type: 'purchase',
        },
      });
      return billPayment;
    });

    return NextResponse.json({
      success: true,
      billPayment: {
        id: result.id,
        billType: result.billType,
        reference: result.reference,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
      },
    });
  } catch (error) {
    console.error('USSD bill payment error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
