import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const versions = await db.appVersion.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, versions });
  } catch (error) {
    console.error('Versions error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { version, description, downloadUrl } = body;

    if (!version) {
      return NextResponse.json({ success: false, message: 'Version requise' }, { status: 400 });
    }

    await db.appVersion.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });

    const created = await db.appVersion.create({
      data: { version, description, downloadUrl, isCurrent: true },
    });

    return NextResponse.json({ success: true, version: created }, { status: 201 });
  } catch (error) {
    console.error('Version create error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne' }, { status: 500 });
  }
}
