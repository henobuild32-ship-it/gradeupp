import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { signToken, setTokenCookie } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

/**
 * POST /api/biometric/native/unlock { secret }
 *
 * Déverrouillage natif : le secret vient du Keystore/Keychain, protégé par
 * la biométrie de l'appareil (empreinte / visage / code du téléphone).
 * Fabrique une session fraîche — même si le cookie avait expiré.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = checkRateLimit({ windowMs: 5 * 60 * 1000, maxRequests: 15, key: `bio-native:${ip}` });
    if (!rl.allowed) return rateLimitResponse(rl.resetIn);

    const body = await request.json();
    const { secret } = body as { secret?: string };

    if (!secret || typeof secret !== 'string' || secret.length < 32) {
      return NextResponse.json({ success: false, message: 'Secret requis' }, { status: 400 });
    }

    const secretHash = createHash('sha256').update(secret).digest('hex');
    const candidates = await db.biometricCredential.findMany({
      where: { credentialId: `native-${secretHash.slice(0, 24)}`, deviceType: 'native', active: true },
      include: { user: true },
    });

    const credential = candidates.find((c) => {
      const stored = Buffer.from(c.publicKey, 'hex');
      const provided = Buffer.from(secretHash, 'hex');
      return stored.length === provided.length && timingSafeEqual(stored, provided);
    });

    if (!credential) {
      return NextResponse.json(
        { success: false, message: 'Déverrouillage biométrique introuvable. Connectez-vous.' },
        { status: 404 }
      );
    }

    const user = credential.user;
    if (user.suspended) {
      return NextResponse.json(
        { success: false, message: `Compte suspendu. ${user.suspensionReason || ''}`.trim() },
        { status: 403 }
      );
    }
    if (user.tempBlocked) {
      return NextResponse.json(
        { success: false, message: 'Compte temporairement bloqué. Contactez le support.' },
        { status: 423 }
      );
    }

    await db.biometricCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });

    const token = await signToken({ userId: user.id, role: user.role });
    const res = NextResponse.json({
      success: true,
      message: 'Déverrouillé',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        pseudo: user.pseudo,
        email: user.email,
        country: user.country,
        role: user.role,
        realBalance: user.realBalance,
        realBalanceFC: user.realBalanceFC,
        bonusBalance: user.bonusBalance,
        bonusBalanceFC: user.bonusBalanceFC,
        isVerified: user.isVerified,
        suspended: user.suspended,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        pinSet: !!user.pin,
        biometricEnabled: true,
        referralCode: user.referralCode,
        agentCode: user.agentCode,
        agentNumber: user.agentNumber,
        validationStatus: user.validationStatus,
      },
    });
    setTokenCookie(res, token);
    return res;
  } catch (error) {
    console.error('Biometric native unlock error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
