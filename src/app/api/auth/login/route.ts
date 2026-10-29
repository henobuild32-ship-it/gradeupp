import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security'
import { verifyAndMigratePassword, signToken, signLoginChallengeToken, setTokenCookie, clearTokenCookie } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { LoginSchema, validateRequest } from '@/lib/validations'
import { normalizeInternationalPhone } from '@/lib/countries'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = checkRateLimit({
      windowMs: 60 * 1000,
      maxRequests: 20,
      key: `login:${ip}`,
    })
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn)
    }

    const body = await request.json()

    const validation = validateRequest(LoginSchema, body)
    if (!validation.success) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 })
    }

    const { phone, password } = validation.data
    const normalizedPhone = normalizeInternationalPhone(phone)
    if (!normalizedPhone) return NextResponse.json({ success: false, message: 'Numéro de téléphone international invalide.' }, { status: 400 })

    let user = await db.user.findUnique({
      where: { phone: normalizedPhone, deletedAt: null },
    })

    if (!user) {
      const digits = normalizedPhone.replace(/\D/g, '')
      user = await db.user.findFirst({ where: { deletedAt: null, OR: [{ phone: digits }, { phone: `+${digits}` }] } })
    }

    if (!user) {
      // Try create-from-bootstrap path not applicable for users
      return NextResponse.json(
        { success: false, message: 'Numéro ou mot de passe incorrect' },
        { status: 404 }
      )
    }

    if (!user.password) {
      return NextResponse.json(
        { success: false, message: 'Numéro ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    const isValid = await verifyAndMigratePassword(user.id, password, user.password)

    if (!isValid) {
      await logSecurityEvent({
        userId: user.id,
        action: 'login_failed',
        details: JSON.stringify({ phone: phone.trim(), reason: 'invalid_password' }),
        riskLevel: 'medium',
      })
      return NextResponse.json(
        { success: false, message: 'Numéro ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    if (user.suspended && user.role !== 'seller') {
      return NextResponse.json(
        { success: false, message: `Compte suspendu. Motif: ${user.suspensionReason || 'Contactez le support'}` },
        { status: 403 }
      )
    }

    if (user.role === 'agent') {
      if (user.validationStatus === 'pending') {
        return NextResponse.json(
          {
            success: false,
            message: 'Votre compte Agent est en attente de validation par l\'administrateur TRAIT.',
            validationStatus: 'pending',
          },
          { status: 403 }
        )
      }

      if (user.validationStatus === 'rejected') {
        return NextResponse.json(
          {
            success: false,
            message: 'Votre demande de compte Agent a été refusée. Motif: ' + (user.validationRejectReason || 'Non spécifié'),
            validationStatus: 'rejected',
          },
          { status: 403 }
        )
      }

      if (user.suspended || user.validationStatus === 'suspended') {
        return NextResponse.json(
          {
            success: false,
            message: 'Votre compte Agent a été suspendu. Motif: ' + (user.suspensionReason || 'Contactez le support TRAIT.'),
            validationStatus: 'suspended',
          },
          { status: 403 }
        )
      }
    }

    if (!user.isVerified && user.email) {
      return NextResponse.json(
        {
          success: false,
          verificationRequired: true,
          email: user.email,
          message: 'Vérifiez votre adresse email avant de vous connecter.',
        },
        { status: 403 }
      )
    }

    // Do NOT rewrite agent codes — codes are assigned at admin validation (AGT-XXXXXX)

    // Sign JWT
    const token = await signToken({ userId: user.id, role: user.role })

    const requiresTwoFactor = user.twoFactorEnabled
    const challengeToken = requiresTwoFactor
      ? await signLoginChallengeToken({ userId: user.id, role: user.role })
      : null

    const response = NextResponse.json({
      success: true,
      challengeToken,
      requiresTwoFactor,
      user: requiresTwoFactor ? null : {
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
        unlockMethod: user.unlockMethod,
        referralCode: user.referralCode,
      },
    })

    if (requiresTwoFactor) clearTokenCookie(response)
    else setTokenCookie(response, token)
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
