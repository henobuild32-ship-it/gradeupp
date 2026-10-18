import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { db } from '@/lib/db';
import { signToken, setTokenCookie } from '@/lib/auth';
import { resolveRp, verifySignedChallenge, base64urlDecode } from '@/lib/webauthn';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

/**
 * POST /api/biometric/auth/verify
 * Vérifie l'assertion WebAuthn (signature réelle de l'authentificateur).
 * En cas de succès : session rafraîchie (nouveau JWT) + profil complet —
 * le déverrouillage biométrique fonctionne même si le cookie de session
 * avait expiré, car l'utilisateur est identifié par sa credential.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = checkRateLimit({ windowMs: 5 * 60 * 1000, maxRequests: 15, key: `bio-auth:${ip}` });
    if (!rl.allowed) return rateLimitResponse(rl.resetIn);

    const body = await request.json();
    const { response, challengeToken } = body as {
      response?: AuthenticationResponseJSON;
      challengeToken?: string;
    };

    if (!response?.id || !challengeToken) {
      return NextResponse.json({ success: false, message: 'Paramètres manquants' }, { status: 400 });
    }

    const storedChallenge = verifySignedChallenge(challengeToken, 'biometric-auth');
    if (!storedChallenge) {
      return NextResponse.json(
        { success: false, message: 'Session de déverrouillage expirée. Réessayez.' },
        { status: 400 }
      );
    }

    const credential = await db.biometricCredential.findFirst({
      where: { credentialId: response.id, active: true },
      include: { user: true },
    });

    if (!credential || !credential.user) {
      return NextResponse.json(
        { success: false, message: 'Déverrouillage biométrique introuvable' },
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

    const { rpID, origins } = resolveRp(request);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: storedChallenge,
      expectedOrigin: origins,
      expectedRPID: [rpID],
      requireUserVerification: true,
      credential: {
        id: credential.credentialId,
        publicKey: base64urlDecode(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports
          ? (credential.transports.split(',') as AuthenticatorTransportFuture[])
          : undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { success: false, message: 'Vérification biométrique échouée' },
        { status: 401 }
      );
    }

    await db.biometricCredential.update({
      where: { id: credential.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    // Rafraîchit la session (le cookie peut avoir expiré depuis la dernière visite)
    const token = await signToken({ userId: user.id, role: user.role });
    const res = NextResponse.json({
      success: true,
      message: 'Déverrouillé',
      token,
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
    console.error('Biometric auth verify error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
