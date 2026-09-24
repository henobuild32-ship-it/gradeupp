import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';

/**
 * POST /api/cards/freeze
 * Gel / dégel de la carte par le titulaire (PIN vérifié côté client via pin-verify).
 *
 * body: { action: 'freeze' | 'unfreeze' }
 *
 * SÉCURITÉ : ne renvoie jamais le PAN ni le CVV.
 * En production, le gel doit aussi être propagé à l'émetteur (webhook / API issuer)
 * — [À CONFIRMER AVEC LA DOC ÉMETTEUR].
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action || !['freeze', 'unfreeze'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Action invalide : freeze ou unfreeze requis' },
        { status: 400 }
      );
    }

    const card = await db.traitCard.findFirst({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, cardType: true },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, message: 'Aucune carte trouvée' },
        { status: 404 }
      );
    }

    if (action === 'freeze') {
      if (card.status === 'blocked') {
        return NextResponse.json(
          { success: false, message: 'Cette carte est bloquée et ne peut plus être dégelée' },
          { status: 400 }
        );
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
    if (card.status !== 'frozen' && card.status !== 'suspended') {
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
