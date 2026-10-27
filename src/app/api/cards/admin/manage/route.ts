import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

function maskCardNumber(num: string | null): string {
  return num ? `•••• ${num.slice(-4)}` : 'Carte TRAIT';
}

// POST - Admin suspend or activate a card
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const { adminId, cardId, action } = await request.json() as {
      adminId: string;
      cardId: string;
      action: 'suspend' | 'activate';
    };

    if (!adminId || !cardId || !action) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants: adminId, cardId, action requis' },
        { status: 400 }
      );
    }

    if (auth.userId !== adminId) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      );
    }

    if (!['suspend', 'activate'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Action non reconnue. Actions possibles: suspend, activate' },
        { status: 400 }
      );
    }

    // Verify admin exists
    const admin = await db.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin non trouvé' },
        { status: 404 }
      );
    }

    // Get the card with user info
    const card = await db.traitCard.findUnique({
      where: { id: cardId },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, message: 'Carte non trouvée' },
        { status: 404 }
      );
    }

    // SUSPEND action
    if (action === 'suspend') {
      if (card.status !== 'active') {
        return NextResponse.json(
          { success: false, message: `Cette carte est déjà ${card.status}` },
          { status: 400 }
        );
      }

      const updatedCard = await db.traitCard.update({
        where: { id: cardId },
        data: { status: 'suspended' },
      });

      // Create admin activity log
      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'suspend_card',
          target: cardId,
          details: JSON.stringify({
            cardNumber: maskCardNumber(card.cardNumber),
            cardType: card.cardType,
            userId: card.userId,
            userName: card.user?.name || card.user?.phone,
          }),
        },
      });

      // Create notification for the user
      await db.notification.create({
        data: {
          userId: card.userId,
          title: 'Carte TRAIT suspendue',
          message: `Votre carte TRAIT ${maskCardNumber(card.cardNumber)} (${card.cardType}) a été suspendue par l'administration. Contactez le support pour plus d'informations.`,
          type: 'card_suspended',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Carte suspendue avec succès',
        card: {
          id: updatedCard.id,
          cardNumber: maskCardNumber(updatedCard.cardNumber),
          status: updatedCard.status,
        },
      });
    }

    // ACTIVATE action
    if (action === 'activate') {
      if (card.status !== 'suspended' && card.status !== 'blocked') {
        return NextResponse.json(
          { success: false, message: `Cette carte est ${card.status}. Seules les cartes suspendues ou bloquées peuvent être réactivées.` },
          { status: 400 }
        );
      }

      const updatedCard = await db.traitCard.update({
        where: { id: cardId },
        data: { status: 'active' },
      });

      // Create admin activity log
      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'activate_card',
          target: cardId,
          details: JSON.stringify({
            cardNumber: maskCardNumber(card.cardNumber),
            cardType: card.cardType,
            userId: card.userId,
            userName: card.user?.name || card.user?.phone,
          }),
        },
      });

      // Create notification for the user
      await db.notification.create({
        data: {
          userId: card.userId,
          title: 'Carte TRAIT réactivée ✓',
          message: `Votre carte TRAIT ${maskCardNumber(card.cardNumber)} (${card.cardType}) a été réactivée. Vous pouvez maintenant l'utiliser pour vos paiements.`,
          type: 'card_approved',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Carte réactivée avec succès',
        card: {
          id: updatedCard.id,
          cardNumber: maskCardNumber(updatedCard.cardNumber),
          status: updatedCard.status,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Action non reconnue' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin card manage error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
