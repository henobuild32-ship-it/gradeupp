import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';

function maskCardNumber(num: string): string {
  return num.length >= 4 ? `****${num.slice(-4)}` : num;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');

    if (!parentId) {
      return NextResponse.json(
        { success: false, message: 'parentId est requis' },
        { status: 400 }
      );
    }

    if (auth.userId !== parentId) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      );
    }

    // Fetch children
    const children = await db.user.findMany({
      where: { parentId },
      select: {
        id: true,
        name: true,
        pseudo: true,
        phone: true,
        realBalance: true,
        realBalanceFC: true,
        suspended: true,
        createdAt: true,
        cards: {
          select: {
            id: true,
            cardType: true,
            cardNumber: true,
            cvv: true,
            qrCode: true,
            expiryDate: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const childrenIds = children.map((c) => c.id);

    // Fetch recharge history (transactions sent by parent to children)
    const recharges = await db.transaction.findMany({
      where: {
        senderId: parentId,
        type: 'child_recharge',
      },
      include: {
        receiver: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Fetch children expenses (payments made by children)
    const expenses = childrenIds.length > 0
      ? await db.transaction.findMany({
          where: {
            senderId: { in: childrenIds },
            type: { in: ['card_payment', 'qr_payment'] },
          },
          include: {
            sender: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : [];

    const safeChildren = children.map(child => ({
      ...child,
      cards: child.cards.map(card => ({
        ...card,
        cardNumber: maskCardNumber(card.cardNumber),
      })),
    }));

    return NextResponse.json({
      success: true,
      children: safeChildren,
      recharges,
      expenses,
    });
  } catch (error) {
    console.error('List child accounts error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération des comptes enfants' },
      { status: 500 }
    );
  }
}
