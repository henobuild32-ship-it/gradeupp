import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security'
import { verifyAndMigratePassword, signToken, setTokenCookie, clearTokenCookie } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { LoginSchema, validateRequest } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = checkRateLimit({
      windowMs: 60 * 1000,
      maxRequests: 5,
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

    const user = await db.user.findUnique({
      where: { phone: phone.trim() },
    })

    if (!user) {
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

    const isValid = await verifyAndMigratePassword(user.id, password.trim(), user.password)

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

    if (user.tempBlocked) {
      return NextResponse.json(
        { success: false, message: 'Votre compte est temporairement bloqué. Contactez le support TRAIT.' },
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

    // Auto-migrate old agent codes to AGT-{phone} format
    if (user.role === 'agent' && user.phone) {
      const phone = user.phone.replace(/\D/g, '')
      const expectedCode = `AGT-${phone}`
      if (user.agentCode !== expectedCode || user.agentNumber !== expectedCode) {
        try {
          const existing = await db.user.findFirst({
            where: { agentCode: expectedCode, id: { not: user.id } },
          })
          if (!existing) {
            await db.user.update({
              where: { id: user.id },
              data: { agentCode: expectedCode, agentNumber: expectedCode },
            })
            user.agentCode = expectedCode
            user.agentNumber = expectedCode
          }
        } catch {}
      }
    }

    // Sign JWT
    const token = await signToken({ userId: user.id, role: user.role })

    const response = NextResponse.json({
      success: true,
      token,
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
        referralCode: user.referralCode,
      },
    })

    setTokenCookie(response, token)
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
