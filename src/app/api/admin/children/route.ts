import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const search = new URL(request.url).searchParams.get('search')?.trim();
    const children = await db.user.findMany({
      where: {
        parentId: { not: null },
        ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { phone: { contains: search } }, { parent: { name: { contains: search, mode: 'insensitive' as const } } }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        pseudo: true,
        phone: true,
        realBalance: true,
        realBalanceFC: true,
        createdAt: true,
        parent: {
          select: { id: true, name: true, phone: true },
        },
        cards: {
          select: {
            id: true, cardType: true, last4: true, qrCode: true, expiryDate: true, status: true, createdAt: true,
            holderName: true, jobTitle: true, birthDate: true, holderPhoto: true, relation: true, maxLoadAmount: true,
            request: { select: { status: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, children }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Admin children list error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json() as { adminId?: string; action?: string; cardId?: string; childId?: string; reason?: string };
    const { adminId, action, cardId, childId, reason } = body;
    if (!adminId || auth.userId !== adminId) return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 });
    if (!action) return NextResponse.json({ success: false, message: 'Action requise' }, { status: 400 });

    if (action === 'confirm-delivery' || action === 'block-card' || action === 'unblock-card' || action === 'suspend-card' || action === 'unsuspend-card') {
      if (!cardId) return NextResponse.json({ success: false, message: 'cardId requis' }, { status: 400 });
      const card = await db.traitCard.findUnique({ where: { id: cardId }, include: { request: true } });
      if (!card) return NextResponse.json({ success: false, message: 'Carte introuvable' }, { status: 404 });
      if (action === 'confirm-delivery') {
        if (card.status !== 'pending_retrieval' || card.request.status !== 'approved') {
          return NextResponse.json({ success: false, message: 'La demande doit être approuvée avant la remise de la carte' }, { status: 409 });
        }
        await db.traitCard.update({ where: { id: cardId }, data: { status: 'active' } });
        await db.notification.create({ data: { userId: card.userId, title: 'Carte remise et activée', message: `La carte TRAIT ${card.cardType} a été remise et activée. Les paiements se font dans le portefeuille TRAIT.`, type: 'card_approved' } });
        await db.adminActivityLog.create({ data: { adminId, action: 'confirm_card_delivery', target: cardId, details: JSON.stringify({ userId: card.userId, cardType: card.cardType }) } });
        return NextResponse.json({ success: true, message: 'Remise confirmée : la carte est activée' });
      }
      const nextStatus = action === 'block-card' ? 'blocked' : action === 'suspend-card' ? 'suspended' : 'active';
      await db.traitCard.update({ where: { id: cardId }, data: { status: nextStatus } });
      await db.adminActivityLog.create({ data: { adminId, action, target: cardId, details: JSON.stringify({ reason: reason?.slice(0, 300) || null }) } });
      return NextResponse.json({ success: true, message: `Carte ${nextStatus === 'active' ? 'réactivée' : nextStatus}` });
    }

    if (action === 'suspend-child' || action === 'unsuspend-child') {
      if (!childId) return NextResponse.json({ success: false, message: 'childId requis' }, { status: 400 });
      await db.user.update({ where: { id: childId }, data: { suspended: action === 'suspend-child' } });
      await db.adminActivityLog.create({ data: { adminId, action, target: childId, details: reason?.slice(0, 300) || null } });
      return NextResponse.json({ success: true, message: action === 'suspend-child' ? 'Compte suspendu' : 'Compte réactivé' });
    }

    return NextResponse.json({ success: false, message: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('Admin child/card action error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
