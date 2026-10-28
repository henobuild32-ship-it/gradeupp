import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const notifications = await db.globalNotification.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { name: true, username: true } },
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('Admin notifications list error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth
    const adminId = auth.userId

    const { title, message, type } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: 'Titre et message requis' },
        { status: 400 }
      );
    }

    const notification = await db.globalNotification.create({
      data: {
        adminId,
        title,
        message,
        type: type || 'general',
        sentToAll: true,
      },
    });

    const users = await db.user.findMany({
      where: { suspended: false, deletedAt: null },
      select: { id: true },
    });

    const notificationsData = users.map(user => ({
      userId: user.id,
      title,
      message,
      type: type || 'announcement',
      read: false,
    }));

    if (notificationsData.length > 0) {
      // Batch in chunks of 1000 to avoid memory issues with large user bases
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < notificationsData.length; i += CHUNK_SIZE) {
        await db.notification.createMany({
          data: notificationsData.slice(i, i + CHUNK_SIZE),
        });
      }
    }

    await db.adminActivityLog.create({
      data: {
        adminId,
        action: 'send_notification',
        target: notification.id,
        details: `Notification envoyée à ${users.length} utilisateurs: "${title}"`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Notification envoyée à ${users.length} utilisateurs`,
      notification,
    });
  } catch (error) {
    console.error('Admin send notification error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
