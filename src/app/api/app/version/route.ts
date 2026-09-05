import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const latest = await db.appVersion.findFirst({
      where: { isCurrent: true },
      orderBy: { createdAt: 'desc' },
    });

    const deployId = process.env.VERCEL_DEPLOYMENT_ID || String(Date.now());

    const changelog = latest?.description
      ? latest.description.split('\n').filter(Boolean)
      : [
          'Nouveau design Super App premium dark',
          'Solde hero avec masquer/afficher',
          'Services par catégories avec onglets',
          'Cartes TRAIT avec nouveau design',
          'Transactions récentes améliorées',
          'Sécurité hyper-renforcée',
          'TRAIT IA - 25+ sujets, 5 langues',
        ];

    const version = latest?.version || '3.1.0';

    const response = NextResponse.json({
      success: true,
      version,
      deployId,
      deployTime: new Date().toISOString(),
      releaseDate: latest ? latest.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      changelog,
      minAppVersion: '0.2.0',
      hasUpdate: true,
      latestVersion: version,
      downloadUrl: latest?.downloadUrl || '/downloads/trait.apk',
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');

    return response;
  } catch (error) {
    const deployId = process.env.VERCEL_DEPLOYMENT_ID || String(Date.now());
    return NextResponse.json({
      success: true,
      version: '3.1.0',
      deployId,
      deployTime: new Date().toISOString(),
      releaseDate: new Date().toISOString().split('T')[0],
      changelog: [
        'Nouveau design Super App premium dark',
        'Solde hero avec masquer/afficher',
        'Services par catégories avec onglets',
        'Sécurité hyper-renforcée',
        'TRAIT IA - 25+ sujets, 5 langues',
      ],
      minAppVersion: '0.2.0',
      hasUpdate: true,
      latestVersion: '3.1.0',
      downloadUrl: '/downloads/trait.apk',
    });
  }
}
