import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';

function maskedBirthDate(value: Date | null | undefined) {
  if (!value) return null;
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/XXXX`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const userId = auth.userId

    const cards = await db.traitCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        cardType: true,
        last4: true,
        qrCode: true,
        expiryDate: true,
        status: true,
        holderName: true,
        jobTitle: true,
        birthDate: true,
        holderPhoto: true,
        request: { select: { status: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    const pendingRequests = await db.cardRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, cardType: true, status: true, holderName: true, jobTitle: true, birthDate: true, photoData: true, rejectReason: true, createdAt: true },
    });

    const recentPayments = await db.cardPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, amount: true, currency: true, description: true, status: true, createdAt: true,
        card: { select: { cardType: true, last4: true } },
      },
    });

    const safeCards = cards.map(card => ({
      ...card,
      cardNumber: card.last4 ? `•••• ${card.last4}` : null,
      birthDate: maskedBirthDate(card.birthDate),
      requestStatus: card.request.status,
      request: undefined,
    }));
    const safeRequests = pendingRequests.map(({ birthDate, ...request }) => ({
      ...request,
      birthDate: maskedBirthDate(birthDate),
    }));
    const safePayments = recentPayments.map(payment => ({
      ...payment,
      card: payment.card ? { ...payment.card, cardNumber: payment.card.last4 ? `•••• ${payment.card.last4}` : null } : null,
    }));

    return NextResponse.json({ success: true, cards: safeCards, pendingRequests: safeRequests, recentPayments: safePayments }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Get user cards error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
