import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));

    const where: any = { role: 'seller' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { pseudo: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
        { businessType: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.suspended = false;
      where.validationStatus = 'validated';
    } else if (status === 'suspended') {
      where.suspended = true;
    } else if (status === 'pending') {
      where.validationStatus = 'pending';
      where.suspended = false;
    }

    const base: any = { role: 'seller' };
    const [total, validatedSellers, pendingSellers, rejectedSellers, suspendedSellers, totalFiltered, sellers] =
      await Promise.all([
        db.user.count({ where: base }),
        db.user.count({ where: { ...base, validationStatus: 'validated', suspended: false } }),
        db.user.count({ where: { ...base, validationStatus: 'pending' } }),
        db.user.count({ where: { ...base, validationStatus: 'rejected' } }),
        db.user.count({ where: { ...base, suspended: true } }),
        db.user.count({ where }),
        db.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            phone: true,
            name: true,
            pseudo: true,
            email: true,
            businessName: true,
            businessType: true,
            location: true,
            country: true,
            validationStatus: true,
            validationRejectReason: true,
            suspended: true,
            suspensionReason: true,
            isVerified: true,
            realBalance: true,
            realBalanceFC: true,
            bonusBalance: true,
            bonusBalanceFC: true,
            createdAt: true,
            _count: {
              select: { marketplaceProducts: true },
            },
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      sellers,
      totalPages: Math.max(1, Math.ceil(totalFiltered / limit)),
      total: totalFiltered,
      stats: {
        totalSellers: total,
        validatedSellers,
        pendingSellers,
        rejectedSellers,
        suspendedSellers,
      },
    });
  } catch (error) {
    console.error('Admin sellers list error:', error);
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
    const { action, sellerId, reason } = body;

    if (!sellerId || !action || !['suspend', 'activate', 'delete'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants ou invalides' },
        { status: 400 }
      );
    }

    if (!reason || !String(reason).trim()) {
      return NextResponse.json(
        { success: false, message: 'Un message de justification est requis' },
        { status: 400 }
      );
    }

    const seller = await db.user.findUnique({
      where: { id: sellerId },
      select: { id: true, role: true, name: true, businessName: true, suspended: true },
    });

    if (!seller || seller.role !== 'seller') {
      return NextResponse.json({ success: false, message: 'Service introuvable' }, { status: 404 });
    }

    const label = seller.businessName || seller.name || seller.id;

    if (action === 'suspend') {
      await db.$transaction([
        db.user.update({
          where: { id: sellerId },
          data: { suspended: true, suspensionReason: String(reason).trim() },
        }),
        db.notification.create({
          data: {
            userId: sellerId,
            title: 'Compte service suspendu',
            message: String(reason).trim(),
            type: 'security',
          },
        }),
        db.adminActivityLog.create({
          data: {
            adminId,
            action: 'suspend_seller',
            target: sellerId,
            details: `Service ${label} suspendu. Motif: ${reason}`,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Service suspendu' });
    }

    if (action === 'activate') {
      await db.$transaction([
        db.user.update({
          where: { id: sellerId },
          data: {
            suspended: false,
            suspensionReason: null,
            validationStatus: 'validated',
            isVerified: true,
          },
        }),
        db.notification.create({
          data: {
            userId: sellerId,
            title: 'Compte service réactivé',
            message: String(reason).trim(),
            type: 'security',
          },
        }),
        db.adminActivityLog.create({
          data: {
            adminId,
            action: 'activate_seller',
            target: sellerId,
            details: `Service ${label} réactivé. Motif: ${reason}`,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Service réactivé' });
    }

    if (action === 'delete') {
      await db.$transaction([
        db.marketplaceProduct.updateMany({
          where: { sellerId },
          data: { active: false, sellerId: null },
        }),
        db.user.update({
          where: { id: sellerId },
          data: {
            suspended: true,
            validationStatus: 'rejected',
            suspensionReason: String(reason).trim(),
            validationRejectReason: String(reason).trim(),
          },
        }),
        db.adminActivityLog.create({
          data: {
            adminId,
            action: 'delete_seller',
            target: sellerId,
            details: `Service ${label} supprimé. Motif: ${reason}`,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Service supprimé' });
    }

    return NextResponse.json(
      { success: false, message: 'Action non reconnue' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin sellers action error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
