import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const user = await db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        pseudo: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const maskedPhone =
      user.phone.length >= 6
        ? user.phone.slice(0, 4) + '***' + user.phone.slice(-3)
        : user.phone;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        pseudo: user.pseudo,
        phone: maskedPhone,
        memberSince: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Public user fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
