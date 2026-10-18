import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';

/** GET /api/biometric — statatut + liste des appareils enregistrés */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const [user, credentials] = await Promise.all([
      db.user.findUnique({
        where: { id: auth.userId },
        select: { biometricEnabled: true, suspended: true, tempBlocked: true },
      }),
      db.biometricCredential.findMany({
        where: { userId: auth.userId, active: true },
        select: {
          id: true,
          deviceName: true,
          deviceType: true,
          transports: true,
          createdAt: true,
          lastUsedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      enabled: user.biometricEnabled,
      webauthnCount: credentials.length,
      hasCredentials: credentials.length > 0,
      credentials: credentials.map((c) => ({
        ...c,
        transports: c.transports ? c.transports.split(',') : [],
      })),
    });
  } catch (error) {
    console.error('Biometric status error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/** DELETE /api/biometric?credentialId=xx | ?all=1 — retire un appareil (ou tous) */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get('credentialId');
    const all = searchParams.get('all') === '1';

    if (all) {
      await db.biometricCredential.deleteMany({ where: { userId: auth.userId } });
      await db.user.update({ where: { id: auth.userId }, data: { biometricEnabled: false } });
      return NextResponse.json({ success: true, message: 'Déverrouillage biométrique désactivé sur tous les appareils' });
    }

    if (!credentialId) {
      return NextResponse.json({ success: false, message: 'credentialId requis' }, { status: 400 });
    }

    await db.biometricCredential.deleteMany({ where: { id: credentialId, userId: auth.userId } });

    const remaining = await db.biometricCredential.count({ where: { userId: auth.userId, active: true } });
    if (remaining === 0) {
      await db.user.update({ where: { id: auth.userId }, data: { biometricEnabled: false } });
    }

    return NextResponse.json({ success: true, message: 'Appareil retiré', remaining });
  } catch (error) {
    console.error('Biometric delete error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
