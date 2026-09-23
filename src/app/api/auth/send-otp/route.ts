import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidEmail, normalizeEmail, sendOTPEmail } from '@/lib/email/service';
import { generateOTP } from '@/lib/otp';
import { otpStore } from '@/lib/otp-store';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit({ windowMs: 60000, maxRequests: 10, key: `otp:${ip}` })
    if (!rl.allowed) return rateLimitResponse(rl.resetIn)

    const body = await request.json();
    const { email, phone } = body;

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, message: 'Email ou téléphone requis' },
        { status: 400 }
      );
    }

    if (!email && typeof phone === 'string' && phone.trim()) {
      const code = generateOTP();
      otpStore.set(phone.trim(), { code, expires: Date.now() + 5 * 60 * 1000 });
      return NextResponse.json({
        success: true,
        message: 'Code OTP envoyé. Vérifiez votre téléphone.',
        demoOtp: code,
      });
    }

    const normalizedEmail = normalizeEmail(String(email));

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
    });

    const emailSent = await sendOTPEmail(normalizedEmail, code);

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Code OTP envoyé par email. Vérifiez votre boîte de réception.'
        : 'Impossible d’envoyer le code OTP. Vérifiez la configuration SMTP.',
      emailSent,
    }, { status: emailSent ? 200 : 502 });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
