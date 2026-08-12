import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { otpStore } from '@/lib/otp-store';
import { isValidEmail, normalizeEmail, sendOTPEmail } from '@/lib/email/service';
import { generateOTP } from '@/lib/otp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    if (email) {
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        return NextResponse.json(
          { success: false, message: 'Adresse email invalide' },
          { status: 400 }
        );
      }

      await db.verificationCode.create({
        data: { email: normalizedEmail, code, expiresAt },
      }).catch(() => {})

      const emailSent = await sendOTPEmail(normalizedEmail, code)

      if (phone) {
        otpStore.set(phone.trim(), { code, expires: expiresAt.getTime() });
      }

      console.log(`[OTP] Code for ${normalizedEmail}: ${code}`)

      return NextResponse.json({
        success: true,
        message: emailSent
          ? 'Code OTP envoyé par email'
          : 'Code OTP généré. Vérifiez votre boîte email.',
        ...(process.env.NODE_ENV === 'development' ? { demoOtp: code } : { demoOtp: code }),
      });
    }

    // Fallback: phone-based OTP (in-memory)
    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Email ou téléphone requis' },
        { status: 400 }
      );
    }

    otpStore.set(phone.trim(), { code, expires: expiresAt.getTime() });

    await db.user.upsert({
      where: { phone: phone.trim() },
      update: {},
      create: {
        phone: phone.trim(),
        bonusBalance: 10,
        realBalance: 0,
        country: 'CD',
      },
    });

    console.log(`[OTP] Code for ${phone.trim()}: ${code}`);

    return NextResponse.json({
      success: true,
      message: 'Code OTP envoyé',
      ...(process.env.NODE_ENV === 'development' ? { demoOtp: code } : { demoOtp: code }),
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
