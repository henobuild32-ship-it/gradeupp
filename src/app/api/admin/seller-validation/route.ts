import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const where: any = { role: 'seller' };

    if (status === 'pending') where.validationStatus = 'pending';
    else if (status === 'rejected') where.validationStatus = 'rejected';
    else if (status === 'validated') where.validationStatus = 'validated';

    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
        { pseudo: { contains: search.trim(), mode: 'insensitive' } },
        { businessName: { contains: search.trim(), mode: 'insensitive' } },
        { businessType: { contains: search.trim(), mode: 'insensitive' } },
        { location: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const sellers = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phone: true,
        name: true,
        pseudo: true,
        businessName: true,
        businessType: true,
        location: true,
        email: true,
        photoId: true,
        country: true,
        validationStatus: true,
        validationRejectReason: true,
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

    const body = await request.json();
    const rawAction = String(body.action || '').toLowerCase();
    const userId = body.userId || body.sellerId;
    const reason = body.reason || body.rejectReason || '';

    const actionMap: Record<string, 'approve' | 'reject' | 'hold'> = {
      approve: 'approve',
      validate: 'approve',
      accept: 'approve',
      reject: 'reject',
      hold: 'hold',
      pending: 'hold',
    };

    const action = actionMap[rawAction];
    if (!userId || !action) {
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

    if (action === 'hold') {
      await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: {
            validationStatus: 'pending',
            validationRejectReason: reason ? String(reason) : null,
          },
        }),
        db.notification.create({
          data: {
            userId,
            title: 'Dossier fournisseur en attente',
            message: reason ? String(reason) : 'Votre dossier est mis en attente.',
            type: 'security',
          },
        }),
        db.adminActivityLog.create({
          data: {
            adminId,
            action: 'hold_seller',
            target: userId,
            details: `Dossier fournisseur ${seller.businessName || userId} mis en attente`,
          },
        }),
      ]);

      return NextResponse.json({ success: true });
    }

    if (seller.validationStatus !== 'pending') {
      return NextResponse.json({ success: false, message: 'Cette demande a déjà été traitée' }, { status: 400 });
    }

    const approved = action === 'approve';
    const message = approved
      ? 'Votre compte fournisseur a été validé. Vous pouvez désormais recevoir des paiements TRAIT.'
      : `Votre demande fournisseur a été refusée. Motif : ${reason || 'Non conforme'}.`;

    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: approved
          ? { validationStatus: 'validated', isVerified: true, validationRejectReason: null }
          : { validationStatus: 'rejected', validationRejectReason: reason || 'Non conforme' },
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
          action: `${approved ? 'approve' : 'reject'}_seller`,
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
