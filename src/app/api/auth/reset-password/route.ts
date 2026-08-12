import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { isValidEmail, normalizeEmail } from '@/lib/email/service';

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Email, code et nouveau mot de passe requis' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { success: false, message: 'Le mot de passe doit contenir au moins 4 caractères' },
        { status: 400 }
      );
    }

    const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : '';
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Adresse email invalide' },
        { status: 400 }
      );
    }

    const record = await db.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, message: 'Code invalide ou expiré' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.$transaction([
      db.verificationCode.update({
        where: { id: record.id },
        data: { used: true },
      }),
      db.user.updateMany({
        where: { email: normalizedEmail },
        data: { password: hashedPassword },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
