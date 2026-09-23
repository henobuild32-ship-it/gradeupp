import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const sellers = await db.user.findMany({
      where: { role: 'seller', validationStatus: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phone: true,
        name: true,
        businessName: true,
        businessType: true,
        location: true,
        email: true,
        country: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, sellers });
  } catch (error) {
    console.error('Admin seller validation error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth
    const adminId = auth.userId

    const { userId, action, rejectReason } = await request.json();

    if (!userId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants ou invalides' },
        { status: 400 }
      );
    }

    const seller = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, validationStatus: true, businessName: true },
    });
    if (!seller || seller.role !== 'seller') {
      return NextResponse.json({ success: false, message: 'Fournisseur introuvable' }, { status: 404 });
    }
    if (seller.validationStatus !== 'pending') {
      return NextResponse.json({ success: false, message: 'Cette demande a déjà été traitée' }, { status: 400 });
    }

    const approved = action === 'approve';
    const message = approved
      ? 'Votre compte fournisseur a été validé. Vous pouvez désormais recevoir des paiements TRAIT.'
      : `Votre demande fournisseur a été refusée. Motif : ${rejectReason || 'Non conforme'}.`;

    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: approved
          ? { validationStatus: 'validated', isVerified: true, validationRejectReason: null }
          : { validationStatus: 'rejected', validationRejectReason: rejectReason || 'Non conforme' },
      }),
      db.notification.create({
        data: {
          userId,
          title: approved ? 'Compte fournisseur validé' : 'Demande fournisseur refusée',
          message,
          type: 'security',
        },
      }),
      db.adminActivityLog.create({
        data: {
          adminId,
          action: `${action}_seller`,
          target: userId,
          details: `${approved ? 'Validation' : 'Refus'} du fournisseur ${seller.businessName || userId}`,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin seller validation action error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
