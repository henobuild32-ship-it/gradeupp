import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setTokenCookie, signToken, verifyLoginChallengeToken } from '@/lib/auth'
import { verifyTOTP } from '@/lib/totp'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `login-2fa:${ip}` })
    if (!limit.allowed) return rateLimitResponse(limit.resetIn)

    const body = await request.json()
    const challengeToken = typeof body.challengeToken === 'string' ? body.challengeToken : ''
    const code = typeof body.code === 'string' ? body.code : ''
    if (!challengeToken || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ success: false, message: 'Code de vérification invalide' }, { status: 400 })
    }

    const challenge = await verifyLoginChallengeToken(challengeToken)
    if (!challenge) {
      return NextResponse.json({ success: false, message: 'La vérification a expiré. Reconnectez-vous.' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: challenge.userId },
      select: {
        id: true,
        phone: true,
        name: true,
        pseudo: true,
        email: true,
        gender: true,
        city: true,
        country: true,
        role: true,
        agentCode: true,
        agentNumber: true,
        validationStatus: true,
        validationRejectReason: true,
        businessName: true,
        businessType: true,
        location: true,
        realBalance: true,
        realBalanceFC: true,
        bonusBalance: true,
        bonusBalanceFC: true,
        isVerified: true,
        parentId: true,
        hasCompletedOnboarding: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        pin: true,
        biometricEnabled: true,
        referralCode: true,
        suspended: true,
        suspensionReason: true,
        tempBlocked: true,
      },
    })

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret || user.role !== challenge.role) {
      return NextResponse.json({ success: false, message: 'La vérification a expiré. Reconnectez-vous.' }, { status: 401 })
    }
    if ((user.suspended && user.role !== 'seller') || user.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Compte suspendu ou temporairement bloqué.' }, { status: 403 })
    }
    if (user.role === 'agent' && user.validationStatus !== 'validated') {
      return NextResponse.json({ success: false, message: 'Votre compte Agent n’est pas validé.' }, { status: 403 })
    }
    if (!verifyTOTP(user.twoFactorSecret, code)) {
      return NextResponse.json({ success: false, message: 'Code invalide. Réessayez.' }, { status: 401 })
    }

    const token = await signToken({ userId: user.id, role: user.role })
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        pseudo: user.pseudo,
        email: user.email,
        gender: user.gender,
        city: user.city,
        country: user.country,
        role: user.role,
        agentCode: user.agentCode,
        agentNumber: user.agentNumber,
        validationStatus: user.validationStatus,
        validationRejectReason: user.validationRejectReason,
        businessName: user.businessName,
        businessType: user.businessType,
        location: user.location,
        realBalance: user.realBalance,
        realBalanceFC: user.realBalanceFC,
        bonusBalance: user.bonusBalance,
        bonusBalanceFC: user.bonusBalanceFC,
        isVerified: user.isVerified,
        parentId: user.parentId,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        twoFactorEnabled: user.twoFactorEnabled,
        pinSet: !!user.pin,
        biometricEnabled: user.biometricEnabled,
        referralCode: user.referralCode,
      },
    })
    setTokenCookie(response, token)
    return response
  } catch (error) {
    console.error('2FA login verification error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
