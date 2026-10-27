import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const { cardId, action } = await request.json() as { cardId?: string; action?: string };
    if (action === 'create') return NextResponse.json({ success: false, message: 'La création directe est désactivée. Validez une demande du titulaire puis confirmez la remise.' }, { status: 409 });
    if (!cardId || !['block', 'unblock'].includes(action || '')) return NextResponse.json({ success: false, message: 'Paramètres invalides' }, { status: 400 });
    const card = await db.traitCard.findUnique({ where: { id: cardId } });
    if (!card) return NextResponse.json({ success: false, message: 'Carte introuvable' }, { status: 404 });
    const status = action === 'block' ? 'blocked' : 'active';
    if (action === 'unblock' && !['blocked', 'suspended'].includes(card.status)) return NextResponse.json({ success: false, message: 'Seule une carte suspendue ou bloquée peut être réactivée' }, { status: 409 });
    if (action === 'unblock' && card.status === 'pending_retrieval') return NextResponse.json({ success: false, message: 'Confirmez la remise avant activation' }, { status: 409 });
    await db.traitCard.update({ where: { id: cardId }, data: { status } });
    await db.adminActivityLog.create({ data: { adminId: auth.userId, action: `${action}_card`, target: cardId, details: JSON.stringify({ userId: card.userId, cardType: card.cardType }) } });
    return NextResponse.json({ success: true, message: status === 'blocked' ? 'Carte bloquée' : 'Carte réactivée' });
  } catch (error) {
    console.error('Legacy admin card management error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
