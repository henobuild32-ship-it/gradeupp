import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';

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
        cardNumber: true,
        cvv: true,
        qrCode: true,
        expiryDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const pendingRequests = await db.cardRequest.findMany({
      where: { userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, cardType: true, status: true, rejectReason: true, createdAt: true },
    });

    const recentPayments = await db.cardPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, amount: true, currency: true, description: true, status: true, createdAt: true,
        card: { select: { cardType: true, cardNumber: true } },
      },
    });

    return NextResponse.json({ success: true, cards, pendingRequests, recentPayments });
  } catch (error) {
    console.error('Get user cards error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
