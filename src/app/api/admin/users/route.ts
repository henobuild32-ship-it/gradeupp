import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { pseudo: { contains: search } },
      ];
    }

    if (role) where.role = role;
    if (status === 'suspended') where.suspended = true;
    if (status === 'active') where.suspended = false;

    const [users, total] = await Promise.all([
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
          country: true,
          role: true,
          agentCode: true,
          realBalance: true,
          bonusBalance: true,
          isVerified: true,
          suspended: true,
          suspensionReason: true,
          validationStatus: true,
          hasCompletedOnboarding: true,
          createdAt: true,
          _count: {
            select: {
              sentTransactions: true,
              receivedTransactions: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin users list error:', error);
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

    const { userId, action, reason } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    if (action === 'suspend') {
      if (!reason) {
        return NextResponse.json(
          { success: false, message: 'Motif de suspension requis' },
          { status: 400 }
        );
      }

      await db.user.update({
        where: { id: userId },
        data: {
          suspended: true,
          suspensionReason: reason,
        },
      });

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'suspend_user',
          target: userId,
          details: `Utilisateur ${user.name || user.phone} suspendu. Motif: ${reason}`,
        },
      });

      return NextResponse.json({ success: true, message: 'Utilisateur suspendu' });
    }

    if (action === 'unsuspend' || action === 'reactivate') {
      await db.user.update({
        where: { id: userId },
        data: {
          suspended: false,
          suspensionReason: null,
        },
      });

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'unsuspend_user',
          target: userId,
          details: `Utilisateur ${user.name || user.phone} réactivé`,
        },
      });

      return NextResponse.json({ success: true, message: 'Utilisateur réactivé' });
    }

    if (action === 'delete') {
      const deletedAt = new Date();
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            deletedAt,
            phone: `deleted-${userId}@deleted.invalid`,
            name: null,
            pseudo: null,
            email: null,
            gender: null,
            city: null,
            country: 'ZZ',
            role: 'deleted',
            agentCode: null,
            agentNumber: null,
            address: null,
            photoId: null,
            photoUrl: null,
            authProvider: 'deleted',
            firebaseUid: null,
            businessName: null,
            businessType: null,
            location: null,
            systemPassword: null,
            systemPasswordSent: false,
            password: null,
            pin: null,
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorRecoveryCodes: [],
            realBalance: 0,
            realBalanceFC: 0,
            bonusBalance: 0,
            bonusBalanceFC: 0,
            isVerified: false,
            suspended: true,
            suspensionReason: 'Compte supprimé',
            tempBlocked: true,
            biometricEnabled: false,
            kycStatus: 'deleted',
            kycSubmittedAt: null,
            kycVerifiedAt: null,
            kycRejectReason: null,
            kycDocumentType: null,
            kycDocumentUrl: null,
            kycSelfieUrl: null,
            kycData: null,
            multiCurrencyBalances: null,
            referralCode: null,
            referralCodeUsed: null,
            referredBy: null,
            parentId: null,
          },
        });
        await tx.notification.deleteMany({ where: { userId } });
        await tx.pushSubscription.deleteMany({ where: { userId } });
        await tx.biometricCredential.deleteMany({ where: { userId } });
        await tx.adminClientMessage.deleteMany({ where: { recipientId: userId } });
        await tx.user.updateMany({ where: { parentId: userId }, data: { parentId: null } });
        await tx.paymentLink.updateMany({ where: { userId }, data: { status: 'disabled' } });
        await tx.recurringPayment.updateMany({
          where: { OR: [{ userId }, { recipientId: userId }] },
          data: { status: 'cancelled' },
        });
        await tx.paymentRequest.updateMany({
          where: { requesterId: userId, status: 'pending' },
          data: { status: 'cancelled', targetId: null, targetPhone: null },
        });
        await tx.paymentRequest.updateMany({
          where: { OR: [{ targetId: userId }, { targetPhone: user.phone }] },
          data: { targetId: null, targetPhone: null },
        });
        await tx.creditPurchase.updateMany({ where: { phoneNumber: user.phone }, data: { phoneNumber: 'redacted' } });
        await tx.bundlePurchase.updateMany({ where: { phoneNumber: user.phone }, data: { phoneNumber: null } });
        await tx.internationalTransfer.updateMany({
          where: { recipientPhone: user.phone },
          data: { recipientName: 'Compte supprimé', recipientPhone: null, recipientAccount: null, recipientBank: null, swiftBic: null, iban: null },
        });
        await tx.transaction.updateMany({
          where: { OR: [{ senderId: userId }, { receiverId: userId }], description: { contains: user.phone } },
          data: { description: null },
        });
        await tx.notification.deleteMany({ where: { message: { contains: user.phone } } });
        await tx.barterMessage.deleteMany({ where: { senderId: userId } });
        await tx.marketplaceProduct.updateMany({
          where: { sellerId: userId },
          data: { active: false, sellerPhone: null, sellerAddress: null },
        });
        await tx.barterOffer.updateMany({ where: { offeredBy: userId }, data: { status: 'removed' } });
        const cards = await tx.traitCard.findMany({ where: { userId }, select: { id: true } });
        for (const card of cards) {
          await tx.traitCard.update({
            where: { id: card.id },
            data: {
              cardNumber: null,
              last4: null,
              cvv: null,
              qrCode: `revoked:${card.id}`,
              expiryDate: null,
              status: 'revoked',
              holderName: null,
              jobTitle: null,
              birthDate: null,
              holderPhoto: null,
            },
          });
        }
        await tx.cardRequest.updateMany({
          where: { userId },
          data: { status: 'deleted', holderName: null, jobTitle: null, birthDate: null, photoData: null },
        });
        await tx.adminActivityLog.create({
          data: {
            adminId,
            action: 'delete_user',
            target: userId,
            details: 'Compte désactivé et données personnelles supprimées; historique financier conservé pour audit.',
          },
        });
      });

      return NextResponse.json({ success: true, message: 'Compte désactivé et données personnelles supprimées' });
    }

    if (action === 'validate_seller') {
      await db.user.update({
        where: { id: userId },
        data: { validationStatus: 'validated' },
      });

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'validate_seller',
          target: userId,
          details: `Service ${user.businessName || user.name} validé`,
        },
      });

      return NextResponse.json({ success: true, message: 'Service validé' });
    }

    if (action === 'reject_seller') {
      await db.user.update({
        where: { id: userId },
        data: { validationStatus: 'rejected', validationRejectReason: reason || 'Non conforme' },
      });

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'reject_seller',
          target: userId,
          details: `Service ${user.businessName || user.name} rejeté`,
        },
      });

      return NextResponse.json({ success: true, message: 'Service rejeté' });
    }

    return NextResponse.json(
      { success: false, message: 'Action non reconnue' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin user action error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
