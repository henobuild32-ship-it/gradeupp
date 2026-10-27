import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const cardType = searchParams.get('cardType') || 'all';
    const search = searchParams.get('search')?.trim() || '';
    const where: Record<string, unknown> = {};
    if (status !== 'all' && ['active', 'suspended', 'blocked', 'pending_retrieval'].includes(status)) where.status = status;
    if (cardType !== 'all' && ['USD', 'FC'].includes(cardType)) where.cardType = cardType;
    if (search) where.OR = [
      { last4: { contains: search } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search } } },
    ];

    const cards = await db.traitCard.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, photoId: true, isVerified: true, realBalance: true, realBalanceFC: true, suspended: true, createdAt: true } },
        request: { select: { id: true, status: true, createdAt: true } },
        _count: { select: { payments: true } },
      },
    });
    const [total, active, suspended, blocked, usd, fc, pendingRetrieval] = await Promise.all([
      db.traitCard.count(), db.traitCard.count({ where: { status: 'active' } }), db.traitCard.count({ where: { status: 'suspended' } }),
      db.traitCard.count({ where: { status: 'blocked' } }), db.traitCard.count({ where: { cardType: 'USD' } }),
      db.traitCard.count({ where: { cardType: 'FC' } }), db.traitCard.count({ where: { status: 'pending_retrieval' } }),
    ]);
    const safeCards = cards.map(({ cardNumber: _pan, cvv: _cvv, last4, ...card }) => ({
      ...card,
      cardNumber: `•••• ${last4 || card.id.slice(-4).toUpperCase()}`,
      last4,
      expiryDate: null,
    }));
    return NextResponse.json({ success: true, cards: safeCards, stats: { total, active, suspended, blocked, usd, fc, pendingRetrieval } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Admin cards list error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const { adminId, action, cardId, userId, cardType, message } = await request.json() as {
      adminId?: string; action?: string; cardId?: string; userId?: string; cardType?: string; message?: string;
    };
    if (!adminId || auth.userId !== adminId) return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 });
    if (action === 'generate') return NextResponse.json({ success: false, message: 'Une carte ne peut être créée qu’après une demande du titulaire puis validation et remise par l’administration.' }, { status: 409 });
    if (action === 'send-info') {
      if (!cardId) return NextResponse.json({ success: false, message: 'cardId requis' }, { status: 400 });
      const card = await db.traitCard.findUnique({ where: { id: cardId } });
      if (!card) return NextResponse.json({ success: false, message: 'Carte introuvable' }, { status: 404 });
      await db.notification.create({ data: { userId: card.userId, title: 'Suivi de votre carte TRAIT', message: `Votre carte TRAIT ${card.cardType} est au statut « ${card.status} ». Les détails de paiement sont gérés dans le portefeuille TRAIT; aucun numéro bancaire ni CVV ne sera envoyé par message.`, type: 'security' } });
      return NextResponse.json({ success: true, message: 'Notification de suivi envoyée sans donnée de paiement' });
    }
    if (action === 'block') {
      if (!cardId) return NextResponse.json({ success: false, message: 'cardId requis' }, { status: 400 });
      const card = await db.traitCard.findUnique({ where: { id: cardId } });
      if (!card) return NextResponse.json({ success: false, message: 'Carte introuvable' }, { status: 404 });
      await db.traitCard.update({ where: { id: cardId }, data: { status: 'blocked' } });
      await db.notification.create({ data: { userId: card.userId, title: 'Carte TRAIT bloquée', message: `Votre carte TRAIT ${card.cardType} a été bloquée par l’administration.${message ? ` Motif : ${message.slice(0, 200)}` : ''}`, type: 'security' } });
      await db.adminActivityLog.create({ data: { adminId, action: 'block_card', target: cardId, details: JSON.stringify({ userId: card.userId, cardType: card.cardType }) } });
      return NextResponse.json({ success: true, message: 'Carte bloquée' });
    }
    return NextResponse.json({ success: false, message: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('Admin card action error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
