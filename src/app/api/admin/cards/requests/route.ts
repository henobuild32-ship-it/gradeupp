import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const requests = await db.cardRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, phone: true } }, card: { select: { id: true, last4: true, status: true } } },
    });
    return NextResponse.json({ success: true, requests }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Legacy card request list error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ success: false, message: 'Utilisez le formulaire de demande titulaire, puis le parcours de validation et de remise admin.' }, { status: 410 });
}
