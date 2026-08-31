import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Generate a deploy ID based on build time (changes each deployment)
const DEPLOY_ID = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());
const DEPLOY_TIME = new Date().toISOString();

export async function GET(request: NextRequest) {
  try {
    const latest = await db.appVersion.findFirst({
      where: { isCurrent: true },
      orderBy: { createdAt: 'desc' },
    });

    const changelog = latest?.description
      ? latest.description.split('\n').filter(Boolean)
      : [
          'TRAIT IA - Assistant intelligent intégré',
          'Notifications push améliorées',
          'Mises à jour automatiques PWA',
          'Corrections et performances',
        ];

    const version = latest?.version || '2.1.0';

    return NextResponse.json({
      success: true,
      version,
      deployId: DEPLOY_ID,
      deployTime: DEPLOY_TIME,
      releaseDate: latest ? latest.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      changelog,
      minAppVersion: '0.2.0',
      hasUpdate: true,
      latestVersion: version,
      downloadUrl: latest?.downloadUrl || '/downloads/trait.apk',
    });
  } catch (error) {
    console.error('Version error:', error);
    return NextResponse.json({
      success: true,
      version: '2.1.0',
      deployId: DEPLOY_ID,
      deployTime: DEPLOY_TIME,
      releaseDate: new Date().toISOString().split('T')[0],
      changelog: [
        'TRAIT IA - Assistant intelligent intégré',
        'Notifications push améliorées',
        'Mises à jour automatiques PWA',
      ],
      minAppVersion: '0.2.0',
      hasUpdate: true,
      latestVersion: '2.1.0',
      downloadUrl: '/downloads/trait.apk',
    });
  }
}
