import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logSecurityEvent } from '@/lib/security';
import { signToken, setTokenCookie } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit({ windowMs: 60000, maxRequests: 5, key: `admin_login:${ip}` })
    if (!rl.allowed) return rateLimitResponse(rl.resetIn)

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Nom d'utilisateur et mot de passe requis" },
        { status: 400 }
      );
    }

    const admin = await db.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      await logSecurityEvent({
        action: 'login_failed',
        details: JSON.stringify({ username, reason: 'user_not_found' }),
        riskLevel: 'medium',
      });

      return NextResponse.json(
        { success: false, message: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      await logSecurityEvent({
        adminId: admin.id,
        action: 'login_failed',
        details: JSON.stringify({ username, reason: 'invalid_password' }),
        riskLevel: 'medium',
      });

      return NextResponse.json(
        { success: false, message: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    await db.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
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
    const token = await signToken({ userId: admin.id, role: 'admin' });

    const response = NextResponse.json({
      success: true,
      token,
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
