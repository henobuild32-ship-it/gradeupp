import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidEmail, normalizeEmail, sendOTPEmail } from '@/lib/email/service';
import { generateOTP } from '@/lib/otp';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit({ windowMs: 60000, maxRequests: 3, key: `otp:${ip}` })
    if (!rl.allowed) return rateLimitResponse(rl.resetIn)

    const body = await request.json();
    const { email } = body;

    if (!email) {
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

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.verificationCode.create({
      data: { email: normalizedEmail, code, expiresAt },
    }).catch(() => {});

    const emailSent = await sendOTPEmail(normalizedEmail, code);

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Code OTP envoyé par email. Vérifiez votre boîte de réception.'
        : 'Code OTP généré. Vérifiez votre boîte email.',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
