import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const clients = await db.user.findMany({
      where: { role: 'client', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phone: true,
        name: true,
        pseudo: true,
        country: true,
        isVerified: true,
        suspended: true,
        hasCompletedOnboarding: true,
        kycStatus: true,
        createdAt: true,
        _count: {
          select: {
            sentTransactions: true,
            receivedTransactions: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, clients });
  } catch (error) {
    console.error('Admin clients list error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
