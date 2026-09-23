import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, requireAdmin } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email/service';

export async function POST(request: NextRequest) {
  try {
    const adminPayload = await requireAdmin(request);
    if (adminPayload instanceof NextResponse) return adminPayload;

    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'userId et newPassword requis' },
        { status: 400 }
      );
    }

    if (
      typeof newPassword !== 'string' ||
      newPassword.length < 12 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      return NextResponse.json(
        { success: false, message: 'Le mot de passe doit contenir au moins 12 caractères, une minuscule, une majuscule et un chiffre' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Send new password to user's email
    if (user.email) {
      try {
        await sendPasswordResetEmail(user.email, newPassword);
      } catch (emailErr) {
        console.error('Failed to send password reset email:', emailErr);
      }
    }

    // Log the action
    await db.adminActivityLog.create({
      data: {
        adminId: adminPayload.userId,
        action: 'reset_user_password',
        target: userId,
        details: `Password reset for user ${user.name || user.id}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: user.email
        ? 'Mot de passe réinitialisé et envoyé par email'
        : 'Mot de passe réinitialisé (aucun email configuré)',
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
