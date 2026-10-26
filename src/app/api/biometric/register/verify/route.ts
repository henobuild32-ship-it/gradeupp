import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { resolveRp, verifySignedChallengeClaim, base64urlEncode } from '@/lib/webauthn';
import { consumeWebAuthnChallenge } from '@/lib/webauthn-challenge-store';

/**
 * POST /api/biometric/register/verify
 * Vérifie l'attestation WebAuthn et stocke la clé publique côté serveur.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { response, challengeToken, deviceName } = body as {
      response?: RegistrationResponseJSON;
      challengeToken?: string;
      deviceName?: string;
    };

    if (!response || !challengeToken) {
      return NextResponse.json({ success: false, message: 'Paramètres manquants' }, { status: 400 });
    }

    const challenge = verifySignedChallengeClaim(challengeToken, 'biometric-register');
    if (!challenge || challenge.subject !== auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Session biométrique expirée. Réessayez.' },
        { status: 400 }
      );
    }

    const { rpID, origins } = resolveRp(request);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { success: false, message: 'Vérification biométrique impossible. Réessayez.' },
        { status: 400 }
      );
    }

    const challengeConsumed = await consumeWebAuthnChallenge('biometric-register', challenge.challenge, auth.userId);
    if (!challengeConsumed) {
      return NextResponse.json({ success: false, message: 'Cette demande biométrique a déjà été utilisée. Recommencez.' }, { status: 409 });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const existing = await db.biometricCredential.findFirst({
      where: { userId: auth.userId, active: true },
      select: { id: true },
    });

    await db.biometricCredential.upsert({
      where: { credentialId: credential.id },
      update: {
        userId: auth.userId,
        publicKey: base64urlEncode(credential.publicKey),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        deviceName: deviceName || null,
        transports: credential.transports?.join(',') || null,
        backedUp: credentialBackedUp,
        active: true,
        lastUsedAt: new Date(),
      },
      create: {
        userId: auth.userId,
        credentialId: credential.id,
        publicKey: base64urlEncode(credential.publicKey),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        deviceName: deviceName || null,
        transports: credential.transports?.join(',') || null,
        backedUp: credentialBackedUp,
        active: true,
        lastUsedAt: new Date(),
      },
    });

    await db.user.update({
      where: { id: auth.userId },
      data: { biometricEnabled: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Déverrouillage biométrique activé sur cet appareil',
      credentialId: credential.id,
      replacedExisting: !!existing,
    });
  } catch (error) {
    console.error('Biometric register verify error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
