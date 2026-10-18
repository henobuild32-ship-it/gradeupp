import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { resolveRp, signChallenge } from '@/lib/webauthn';

/**
 * POST /api/biometric/auth/options
 * Options d'authentification WebAuthn (déverrouillage).
 * - Avec session valide : toutes les credentials de l'utilisateur.
 * - Sans session (cookie expiré) : passez credentialId (stocké sur l'appareil)
 *   → l'utilisateur est retrouvé via la credential → vrai login biométrique.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { credentialId } = body as { credentialId?: string };

    const auth = await getAuthUser(request);
    let userId: string | null = auth?.userId || null;

    let allowCredentials: { id: string; transports?: string[] }[] = [];

    if (userId) {
      const creds = await db.biometricCredential.findMany({
        where: { userId, active: true },
        select: { credentialId: true, transports: true },
      });
      if (creds.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Aucun appareil biométrique enregistré pour ce compte' },
          { status: 400 }
        );
      }
      allowCredentials = creds.map((c) => ({
        id: c.credentialId,
        transports: c.transports ? (c.transports.split(',') as string[]) : undefined,
      }));
    } else if (credentialId) {
      const cred = await db.biometricCredential.findFirst({
        where: { credentialId, active: true },
        select: { credentialId: true, transports: true, userId: true, user: { select: { suspended: true } } },
      });
      if (!cred || cred.user.suspended) {
        return NextResponse.json(
          { success: false, message: 'Déverrouillage biométrique introuvable. Connectez-vous.' },
          { status: 404 }
        );
      }
      userId = cred.userId;
      allowCredentials = [
        { id: cred.credentialId, transports: cred.transports ? (cred.transports.split(',') as string[]) : undefined },
      ];
    } else {
      return NextResponse.json(
        { success: false, message: 'Session ou appareil biométrique requis' },
        { status: 401 }
      );
    }

    const { rpID } = resolveRp(request);

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
      allowCredentials,
    });

    return NextResponse.json({
      success: true,
      options,
      challengeToken: signChallenge('biometric-auth', options.challenge, userId),
    });
  } catch (error) {
    console.error('Biometric auth options error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
