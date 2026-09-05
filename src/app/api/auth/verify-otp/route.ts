import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { otpStore } from '@/lib/otp-store';
import { signToken, setTokenCookie } from '@/lib/auth';
import { normalizeEmail } from '@/lib/email/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, code, mode } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Code OTP requis' },
        { status: 400 }
      );
    }

    const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : null;

    if (email && normalizedEmail) {
      const record = await db.verificationCode.findFirst({
        where: {
          email: normalizedEmail,
          code,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!record) {
        return NextResponse.json(
          { success: false, message: 'Code invalide ou expiré' },
          { status: 400 }
        );
      }

      const expectedCode = Buffer.from(record.code)
      const inputCode = Buffer.from(code)
      if (expectedCode.length !== inputCode.length || !timingSafeEqual(expectedCode, inputCode)) {
        return NextResponse.json(
          { success: false, message: 'Code invalide ou expiré' },
          { status: 400 }
        );
      }

      if (mode !== 'forgot') {
        await db.verificationCode.update({
          where: { id: record.id },
          data: { used: true },
        });
      }

      const user = await db.user.findFirst({ where: { email: normalizedEmail } });

      if (!user) {
        return NextResponse.json({
          success: true,
          message: 'Code vérifié',
          user: null,
        });
      }

      const token = await signToken({ userId: user.id, role: user.role });
      const response = NextResponse.json({
        success: true,
        message: 'Code vérifié',
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          country: user.country,
          realBalance: user.realBalance,
          realBalanceFC: user.realBalanceFC,
          bonusBalance: user.bonusBalance,
          bonusBalanceFC: user.bonusBalanceFC,
          isVerified: true,
          role: user.role,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        },
      });
      setTokenCookie(response, token);
      return response;
    }

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Email ou téléphone requis' },
        { status: 400 }
      );
    }

    const stored = otpStore.get(phone.trim());

    if (!stored) {
      return NextResponse.json(
        { success: false, message: 'Code OTP non trouvé ou expiré. Veuillez en demander un nouveau.' },
        { status: 400 }
      );
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(phone.trim());
      return NextResponse.json(
        { success: false, message: 'Code OTP expiré. Veuillez en demander un nouveau.' },
        { status: 400 }
      );
    }

    const expected = Buffer.from(stored.code);
    const actual = Buffer.from(code);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return NextResponse.json(
        { success: false, message: 'Code OTP incorrect' },
        { status: 401 }
      );
    }

    otpStore.delete(phone.trim());

    const user = await db.user.findUnique({
      where: { phone: phone.trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const wasVerified = user.isVerified;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    if (!wasVerified && user.referredBy) {
      const referrer = await db.user.findFirst({
        where: { referralCode: user.referredBy },
      });
      if (referrer) {
        // Increment referrer's real balance by $0.1
        await db.user.update({
          where: { id: referrer.id },
          data: { realBalance: { increment: 0.1 } },
        });

        // Create ReferralReward record
        await db.referralReward.create({
          data: {
            userId: referrer.id,
            referredId: user.id,
            amount: 0.1,
            currency: 'USD',
            type: 'signup',
            status: 'completed',
          },
        });

        // Create notification for referrer
        await db.notification.create({
          data: {
            userId: referrer.id,
            title: 'Récompense de parrainage',
            message: `Félicitations ! Vous avez reçu 0.10 USD car ${user.name || user.pseudo} a activé son compte.`,
            type: 'bonus',
          },
        });

        // Trigger push notification for referrer
        try {
          const { sendPushToUser } = await import('@/lib/push');
          await sendPushToUser(referrer.id, {
            title: 'Récompense de parrainage',
            body: `Félicitations ! Vous avez reçu 0.10 USD car ${user.name || user.pseudo} a activé son compte.`,
            url: '/referrals',
          });
        } catch (err) {
          console.error('Error sending push for referral reward:', err);
        }
      }
    }

    const token = await signToken({ userId: updatedUser.id, role: updatedUser.role });
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        pseudo: updatedUser.pseudo,
        country: updatedUser.country,
        email: updatedUser.email,
        realBalance: updatedUser.realBalance,
        realBalanceFC: updatedUser.realBalanceFC,
        bonusBalance: updatedUser.bonusBalance,
        bonusBalanceFC: updatedUser.bonusBalanceFC,
        isVerified: updatedUser.isVerified,
        role: updatedUser.role,
        hasCompletedOnboarding: updatedUser.hasCompletedOnboarding,
        referralCode: updatedUser.referralCode,
      },
    });
    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
