import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

function maskedBirthDate(value: Date | null) {
  return value ? `${String(value.getUTCDate()).padStart(2, '0')}/${String(value.getUTCMonth() + 1).padStart(2, '0')}/XXXX` : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const status = new URL(request.url).searchParams.get('status') || 'all';
    const where = status !== 'all' && ['pending', 'approved', 'rejected', 'suspended'].includes(status) ? { status } : {};
    const requests = await db.cardRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, photoId: true, isVerified: true, createdAt: true } },
        admin: { select: { id: true, name: true, username: true } },
        card: { select: { id: true, last4: true, qrCode: true, status: true, createdAt: true } },
      },
    });
    return NextResponse.json({ success: true, requests }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Admin card requests list error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const { adminId, requestId, action, reason } = await request.json() as {
      adminId?: string;
      requestId?: string;
      action?: 'approve' | 'reject' | 'suspend' | 'confirm-delivery';
      reason?: string;
    };
    if (!adminId || !requestId || !action) return NextResponse.json({ success: false, message: 'Paramètres manquants' }, { status: 400 });
    if (auth.userId !== adminId) return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 });
    const cardRequest = await db.cardRequest.findUnique({ where: { id: requestId }, include: { card: true, user: { select: { id: true, name: true, phone: true } } } });
    if (!cardRequest) return NextResponse.json({ success: false, message: 'Demande introuvable' }, { status: 404 });

    if (action === 'confirm-delivery') {
      if (cardRequest.status !== 'approved' || !cardRequest.card || cardRequest.card.status !== 'pending_retrieval') {
        return NextResponse.json({ success: false, message: 'La demande doit être approuvée et la carte prête au retrait' }, { status: 409 });
      }
      await db.traitCard.update({ where: { id: cardRequest.card.id }, data: { status: 'active' } });
      await db.notification.create({ data: { userId: cardRequest.userId, title: 'Carte remise et activée', message: `Votre carte TRAIT ${cardRequest.cardType} a été remise et activée. Elle fonctionne dans le portefeuille TRAIT.`, type: 'card_approved' } });
      await db.adminActivityLog.create({ data: { adminId, action: 'confirm_card_delivery', target: requestId, details: JSON.stringify({ userId: cardRequest.userId, cardType: cardRequest.cardType }) } });
      return NextResponse.json({ success: true, message: 'Remise confirmée : la carte est activée' });
    }

    if (cardRequest.status !== 'pending') return NextResponse.json({ success: false, message: `Demande déjà traitée (${cardRequest.status})` }, { status: 409 });
    if (!['approve', 'reject', 'suspend'].includes(action)) return NextResponse.json({ success: false, message: 'Action non reconnue' }, { status: 400 });
    if (action === 'reject' && !reason?.trim()) return NextResponse.json({ success: false, message: 'Une raison du refus est requise' }, { status: 400 });

    if (action === 'approve') {
      const updated = await db.$transaction(async tx => {
        const requestUpdate = await tx.cardRequest.update({ where: { id: requestId }, data: { status: 'approved', adminId } });
        const card = await tx.traitCard.upsert({
          where: { cardRequestId: requestId },
          create: {
            userId: cardRequest.userId,
            cardRequestId: requestId,
            cardType: cardRequest.cardType,
            qrCode: randomUUID(),
            status: 'pending_retrieval',
            holderName: cardRequest.holderName || cardRequest.user.name,
            jobTitle: cardRequest.jobTitle,
            birthDate: cardRequest.birthDate,
            holderPhoto: cardRequest.photoData,
            relation: 'self',
          },
          update: {
            status: 'pending_retrieval',
            holderName: cardRequest.holderName || cardRequest.user.name,
            jobTitle: cardRequest.jobTitle,
            birthDate: cardRequest.birthDate,
            holderPhoto: cardRequest.photoData,
          },
        });
        return { requestUpdate, card };
      });
      await db.notification.create({ data: { userId: cardRequest.userId, title: 'Demande approuvée — retrait requis', message: `Votre demande de carte TRAIT ${cardRequest.cardType} est approuvée. Présentez-vous à l’administration pour le retrait; la carte sera activée à la remise.`, type: 'card_approved' } });
      await db.adminActivityLog.create({ data: { adminId, action: 'approve_card_request', target: requestId, details: JSON.stringify({ userId: cardRequest.userId, cardType: cardRequest.cardType, cardId: updated.card.id }) } });
      return NextResponse.json({ success: true, message: 'Demande approuvée; carte en attente de retrait', cardRequest: { id: updated.requestUpdate.id, status: updated.requestUpdate.status }, card: { id: updated.card.id, cardType: updated.card.cardType, last4: null, status: updated.card.status } });
    }

    const updatedRequest = await db.cardRequest.update({ where: { id: requestId }, data: { status: action === 'reject' ? 'rejected' : 'suspended', adminId, rejectReason: reason?.trim().slice(0, 500) || (action === 'suspend' ? 'Demande suspendue par l’administration' : undefined) } });
    if (cardRequest.card) await db.traitCard.delete({ where: { id: cardRequest.card.id } });
    await db.adminActivityLog.create({ data: { adminId, action: `${action}_card_request`, target: requestId, details: JSON.stringify({ userId: cardRequest.userId, cardType: cardRequest.cardType, reason: reason?.trim().slice(0, 500) || null }) } });
    await db.notification.create({ data: { userId: cardRequest.userId, title: action === 'reject' ? 'Demande de carte refusée' : 'Demande de carte suspendue', message: action === 'reject' ? `Votre demande de carte TRAIT ${cardRequest.cardType} a été refusée. Motif : ${updatedRequest.rejectReason}` : `Votre demande de carte TRAIT ${cardRequest.cardType} a été suspendue. Contactez le support.`, type: 'card_rejected' } });
    return NextResponse.json({ success: true, message: action === 'reject' ? 'Demande refusée' : 'Demande suspendue', cardRequest: { id: updatedRequest.id, status: updatedRequest.status, rejectReason: updatedRequest.rejectReason } });
  } catch (error) {
    console.error('Admin card request action error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
