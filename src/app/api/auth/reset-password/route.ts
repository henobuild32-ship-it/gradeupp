import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { hashPassword, signToken, setTokenCookie } from '@/lib/auth';
import { sanitizeSafeUser } from '@/lib/sanitize';
import { isValidEmail, normalizeEmail } from '@/lib/email/service';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = body;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const ipLimit = checkRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, key: `reset-password-ip:${ip}` });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetIn);

    if (typeof email !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json({ success: false, message: 'Email, code et nouveau mot de passe requis' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json({ success: false, message: 'Adresse email invalide' }, { status: 400 });
    }

    const identityLimit = checkRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, key: `reset-password-email:${ip}:${normalizedEmail}` });
    if (!identityLimit.allowed) return rateLimitResponse(identityLimit.resetIn);

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ success: false, message: 'Code invalide ou expiré' }, { status: 400 });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ success: false, message: 'Le mot de passe doit contenir entre 8 et 128 caractères' }, { status: 400 });
    }

    const [record, users] = await Promise.all([
      db.verificationCode.findFirst({
        where: { email: normalizedEmail, code, used: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      }),
      db.user.findMany({ where: { email: normalizedEmail }, take: 2, select: { id: true } }),
    ]);

    if (!record || users.length !== 1) {
      return NextResponse.json({ success: false, message: 'Code invalide ou expiré' }, { status: 400 });
    }

    const expectedCode = Buffer.from(record.code);
    const submittedCode = Buffer.from(code);
    if (expectedCode.length !== submittedCode.length || !timingSafeEqual(expectedCode, submittedCode)) {
      return NextResponse.json({ success: false, message: 'Code invalide ou expiré' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    const now = new Date();
    const reset = await db.$transaction(async (tx) => {
      const claimed = await tx.verificationCode.updateMany({
        where: { id: record.id, used: false, expiresAt: { gt: now } },
        data: { used: true },
      });
      if (claimed.count !== 1) return false;

      const updated = await tx.user.updateMany({ where: { id: users[0].id }, data: { password: hashedPassword } });
      if (updated.count !== 1) throw new Error('Password reset target no longer exists');
      return true;
    });

    if (!reset) return NextResponse.json({ success: false, message: 'Code invalide ou expiré' }, { status: 400 });

    // Ouverture directe de la session : le code email a déjà prouvé l'identité.
    const freshUser = await db.user.findUnique({ where: { id: users[0].id } });
    if (freshUser && !freshUser.deletedAt && !freshUser.suspended && !freshUser.tempBlocked) {
      const token = await signToken({ userId: freshUser.id, role: freshUser.role });
      const response = NextResponse.json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
        user: sanitizeSafeUser(freshUser),
      });
      setTokenCookie(response, token);
      return response;
    }

    return NextResponse.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
