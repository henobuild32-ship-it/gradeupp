import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const cards = await db.traitCard.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({
      success: true,
      cards: cards.map(c => ({
        id: c.id,
        userId: c.userId,
        cardType: c.cardType,
        cardNumber: c.last4 ? `•••• ${c.last4}` : null,
        last4: c.last4,
        status: c.status,
        expiryDate: null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        user: c.user,
      })),
    });
  } catch (error) {
    console.error('Admin cards list error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
