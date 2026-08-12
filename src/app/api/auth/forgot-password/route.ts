import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidEmail, normalizeEmail, sendOTPEmail } from '@/lib/email/service';
import { generateOTP } from '@/lib/otp';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email requis' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Adresse email invalide' },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({ where: { email: normalizedEmail } });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Aucun compte trouvé avec cet email' },
        { status: 404 }
      );
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.verificationCode.create({
      data: { email: normalizedEmail, code, expiresAt },
    });

    await sendOTPEmail(normalizedEmail, code);

    return NextResponse.json({
      success: true,
      message: 'Code de réinitialisation envoyé par email',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
