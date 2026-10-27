import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { randomUUID } from 'node:crypto';

/**
 * POST /api/cards/freeze
 * Gel / dégel de la carte par le titulaire (PIN vérifié côté client via pin-verify).
 *
 * body: { action: 'freeze' | 'unfreeze', cardId?: string }
 *
 * SÉCURITÉ : ne renvoie jamais le PAN ni le CVV.
 * En production, le gel doit aussi être propagé à l'émetteur (webhook / API issuer)
 * — [À CONFIRMER AVEC LA DOC ÉMETTEUR].
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `card-status:${auth.userId}` });
    if (!limit.allowed) return rateLimitResponse(limit.resetIn);

    const body = await request.json().catch(() => null);
    const action = typeof body?.action === 'string' ? body.action : '';
    const cardId = typeof body?.cardId === 'string' ? body.cardId : '';

    if (!['freeze', 'unfreeze', 'lost'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Action invalide' },
        { status: 400 }
      );
    }

    const card = await db.traitCard.findFirst({
      where: { userId: auth.userId, ...(cardId ? { id: cardId } : {}) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, cardType: true },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, message: 'Aucune carte trouvée' },
        { status: 404 }
      );
    }

    if (action === 'lost') {
      if (card.status === 'blocked') {
        return NextResponse.json({ success: true, status: 'blocked', message: 'Cette carte est déjà bloquée.' });
      }
      if (!['active', 'frozen', 'pending_retrieval'].includes(card.status)) {
        return NextResponse.json({ success: false, message: `Cette carte ne peut pas être bloquée (${card.status}).` }, { status: 409 });
      }
      const updated = await db.traitCard.updateMany({
        where: { id: card.id, userId: auth.userId, status: card.status },
        data: { status: 'blocked', qrCode: randomUUID() },
      });
      if (updated.count !== 1) {
        return NextResponse.json({ success: false, message: 'Le statut de la carte a changé. Actualisez et réessayez.' }, { status: 409 });
      }
      await db.notification.create({
        data: {
          userId: auth.userId,
          title: 'Carte déclarée perdue ou volée',
          message: 'La carte a été bloquée et son ancien QR invalidé. Demandez une nouvelle carte depuis l’application.',
          type: 'general',
        },
      });
      await logSecurityEvent({
        userId: auth.userId,
        action: 'card_report_lost',
        details: JSON.stringify({ cardId: card.id }),
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent')?.slice(0, 300),
        riskLevel: 'high',
      });
      return NextResponse.json({ success: true, status: 'blocked', message: 'Carte bloquée et ancien QR invalidé.' }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (action === 'freeze') {
      if (card.status !== 'active' && card.status !== 'frozen') {
        return NextResponse.json({ success: false, message: `Cette carte est ${card.status} et ne peut pas être gelée` }, { status: 409 });
      }
      const updated = await db.traitCard.update({
        where: { id: card.id },
        data: { status: 'frozen' },
      });
      await db.notification.create({
        data: {
          userId: auth.userId,
          title: 'Carte gelée',
          message: 'Votre carte a été gelée. Vous pouvez la dégeler à tout moment.',
          type: 'general',
        },
      });
      await logSecurityEvent({
        userId: auth.userId,
        action: 'card_freeze',
        details: JSON.stringify({ cardId: card.id }),
        riskLevel: 'low',
      });
      return NextResponse.json({
        success: true,
        status: updated.status,
        message: 'Carte gelée',
      });
    }

    // unfreeze
    if (card.status !== 'frozen') {
      return NextResponse.json(
        { success: false, message: "Cette carte n'est pas gelée" },
        { status: 400 }
      );
    }
    const updated = await db.traitCard.update({
      where: { id: card.id },
      data: { status: 'active' },
    });
    await db.notification.create({
      data: {
        userId: auth.userId,
        title: 'Carte dégelée',
        message: 'Votre carte est de nouveau active.',
        type: 'general',
      },
    });
    await logSecurityEvent({
      userId: auth.userId,
      action: 'card_unfreeze',
      details: JSON.stringify({ cardId: card.id }),
      riskLevel: 'low',
    });
    return NextResponse.json({
      success: true,
      status: updated.status,
      message: 'Carte dégelée',
    });
  } catch (error) {
    console.error('Card freeze error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
