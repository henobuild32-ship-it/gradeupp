import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { hashPassword, requireAdmin } from '@/lib/auth';

function isStrongPassword(password: unknown): password is string {
  return typeof password === 'string'
    && password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !isStrongPassword(newPassword)) {
      return NextResponse.json(
        { success: false, message: 'Le nouveau mot de passe doit contenir au moins 12 caractères, une minuscule, une majuscule et un chiffre.' },
        { status: 400 },
      );
    }

    const admin = await db.admin.findUnique({ where: { id: auth.userId } });
    if (!admin || !(await bcrypt.compare(currentPassword, admin.password))) {
      return NextResponse.json({ success: false, message: 'Mot de passe actuel incorrect.' }, { status: 401 });
    }

    await db.$transaction([
      db.admin.update({ where: { id: admin.id }, data: { password: await hashPassword(newPassword) } }),
      db.adminActivityLog.create({
        data: { adminId: admin.id, action: 'change_admin_password', details: 'Mot de passe administrateur modifié.' },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Mot de passe administrateur modifié.' });
  } catch (error) {
    console.error('Admin password change error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}