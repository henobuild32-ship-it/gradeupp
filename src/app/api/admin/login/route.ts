import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logSecurityEvent } from '@/lib/security';
import { signToken, setTokenCookie } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { isAdminTemporarilyLocked, normalizeAdminUsername, verifyAdminPassword } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit({ windowMs: 60000, maxRequests: 5, key: `admin_login:${ip}` })
    if (!rl.allowed) return rateLimitResponse(rl.resetIn)

    const body = await request.json().catch(() => ({}));
    const username = normalizeAdminUsername(body?.username);
    const password = body?.password;

    if (!username || typeof password !== 'string' || password.length === 0 || password.length > 128) {
      return NextResponse.json(
        { success: false, message: "Nom d'utilisateur et mot de passe requis" },
        { status: 400 }
      );
    }

    const admin = await db.admin.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!admin) {
      await logSecurityEvent({
        action: 'login_failed',
        details: JSON.stringify({ reason: 'admin_login_failed' }),
        riskLevel: 'medium',
      });

      return NextResponse.json(
        { success: false, message: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    if (isAdminTemporarilyLocked(admin.lockedUntil)) {
      return NextResponse.json({ success: false, code: 'ACCOUNT_TEMPORARILY_LOCKED', message: 'Compte verrouillé temporairement. Réessayez plus tard.' }, { status: 423 });
    }

    const isPasswordValid = await verifyAdminPassword(password, admin.password);
    if (!isPasswordValid) {
      const failedLoginAttempts = admin.failedLoginAttempts + 1;
      const lockedUntil = failedLoginAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await db.admin.update({ where: { id: admin.id }, data: { failedLoginAttempts, lockedUntil } });
      await logSecurityEvent({
        adminId: admin.id,
        action: 'login_failed',
        details: JSON.stringify({ reason: 'invalid_password' }),
        riskLevel: 'medium',
      });

      return NextResponse.json(
        { success: false, code: lockedUntil ? 'ACCOUNT_TEMPORARILY_LOCKED' : 'INVALID_CREDENTIALS', message: lockedUntil ? 'Compte verrouillé temporairement. Réessayez plus tard.' : 'Identifiants incorrects' },
        { status: lockedUntil ? 423 : 401 }
      );
    }

    await db.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });

    await db.adminActivityLog.create({
      data: {
        adminId: admin.id,
        action: 'login',
        details: 'Connexion administrateur réussie',
      },
    });

    await logSecurityEvent({
      adminId: admin.id,
      action: 'login',
      details: JSON.stringify({ username, adminName: admin.name }),
      riskLevel: 'low',
    });

    // Sign JWT for admin
    const token = await signToken({ userId: admin.id, role: admin.role, authVersion: admin.authVersion });

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    });

    setTokenCookie(response, token, true);
    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
