import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentVersion = searchParams.get('currentVersion');

    const latest = await db.appVersion.findFirst({
      where: { isCurrent: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      return NextResponse.json({
        success: true,
        version: '2.0.1',
        releaseDate: '2026-07-29',
        changelog: [
          'Page d\'accueil premium avec design editorial luxury',
          'Sélecteur de langue intégré (FR, EN, Lingala, Swahili...)',
          'Sécurité des transactions renforcée (anti double-dépense)',
          'Notifications temps réel améliorées',
          'Corrections du système d\'authentification',
        ],
        minAppVersion: '0.2.0',
        hasUpdate: true,
        latestVersion: '2.0.1',
        downloadUrl: '/downloads/trait.apk',
      });
    }

    const hasUpdate = currentVersion ? currentVersion !== latest.version : false;

    return NextResponse.json({
      success: true,
      version: latest.version,
      releaseDate: latest.createdAt.toISOString().split('T')[0],
      changelog: latest.description ? latest.description.split('\n').filter(Boolean) : [],
      minAppVersion: '0.2.0',
      hasUpdate,
      latestVersion: latest.version,
      downloadUrl: latest.downloadUrl || '/downloads/trait.apk',
    });
  } catch (error) {
    console.error('Version error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne' }, { status: 500 });
  }
}
