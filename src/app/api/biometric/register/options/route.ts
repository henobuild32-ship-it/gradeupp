import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { resolveRp, signChallenge, base64urlEncode } from '@/lib/webauthn';

/**
 * POST /api/biometric/register/options
 * Génération des options d'enregistrement WebAuthn (authentifié).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, pseudo: true, email: true, phone: true, suspended: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
    }
    if (user.suspended) {
      return NextResponse.json({ success: false, message: 'Compte suspendu' }, { status: 403 });
    }

    const existing = await db.biometricCredential.findMany({
      where: { userId: user.id, active: true },
      select: { credentialId: true, transports: true },
    });

    const { rpID } = resolveRp(request);

    const options = await generateRegistrationOptions({
      rpName: 'TRAIT',
      rpID,
      userID: base64urlEncode(new TextEncoder().encode(user.id)),
      userName: user.email || user.phone || user.id,
      userDisplayName: user.name || user.pseudo || 'Utilisateur TRAIT',
      attestationType: 'none',
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: c.transports ? c.transports.split(',') as AuthenticatorTransportFuture[] : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },
    });

    return NextResponse.json({
      success: true,
      options,
      challengeToken: signChallenge('biometric-register', options.challenge, user.id),
    });
  } catch (error) {
    console.error('Biometric register options error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
