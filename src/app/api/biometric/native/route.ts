import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';

/**
 * POST /api/biometric/native { enable: boolean, secret?, deviceName? }
 *
 * Appareils natifs (APK Android / iOS via capacitor-native-biometric :
 * empreinte, visage ou code du téléphone). Le client génère un secret
 * aléatoire, le stocke dans le Keystore/Keychain sécurisé et l'envoie une
 * seule fois ici ; le serveur ne garde que son hash SHA-256. Le
 * déverrouillage renvoie le secret depuis le Keystore (protégé par la
 * biométrie de l'appareil) → /api/biometric/native/unlock.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { enable, secret, deviceName } = body as {
      enable?: boolean;
      secret?: string;
      deviceName?: string;
    };

    if (typeof enable !== 'boolean') {
      return NextResponse.json({ success: false, message: 'enable (booléen) requis' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { suspended: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
    }
    if (enable && user.suspended) {
      return NextResponse.json({ success: false, message: 'Compte suspendu' }, { status: 403 });
    }

    if (!enable) {
      await db.biometricCredential.updateMany({
        where: { userId: auth.userId, deviceType: 'native' },
        data: { active: false },
      });
      const webauthnCount = await db.biometricCredential.count({
        where: { userId: auth.userId, active: true },
      });
      if (webauthnCount === 0) {
        await db.user.update({ where: { id: auth.userId }, data: { biometricEnabled: false } });
      }
      return NextResponse.json({ success: true, enabled: webauthnCount > 0 });
    }

    if (!secret || typeof secret !== 'string' || secret.length < 32) {
      return NextResponse.json(
        { success: false, message: 'Secret de déverrouillage invalide' },
        { status: 400 }
      );
    }

    const secretHash = createHash('sha256').update(secret).digest('hex');
    const credentialId = `native-${secretHash.slice(0, 24)}`;

    await db.biometricCredential.upsert({
      where: { credentialId },
      update: {
        userId: auth.userId,
        publicKey: secretHash,
        deviceType: 'native',
        deviceName: deviceName || null,
        active: true,
        lastUsedAt: new Date(),
      },
      create: {
        userId: auth.userId,
        credentialId,
        publicKey: secretHash,
        deviceType: 'native',
        deviceName: deviceName || null,
        active: true,
        lastUsedAt: new Date(),
      },
    });

    await db.user.update({
      where: { id: auth.userId },
      data: { biometricEnabled: true },
    });

    return NextResponse.json({ success: true, enabled: true, credentialId });
  } catch (error) {
    console.error('Biometric native toggle error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/** GET /api/biometric/native — secret d'enrôlement généré côté serveur si besoin */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    // Le secret est généré côté client (crypto.getRandomValues) — cet
    // endpoint expose juste un nonce d'aide si le client ne peut pas le faire.
    return NextResponse.json({ secret: randomBytes(32).toString('base64url') });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
