import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const user = await db.user.findUnique({
      where: { id: auth.userId },
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
        address: true,
        photoId: true,
        realBalance: true,
        realBalanceFC: true,
        bonusBalance: true,
        bonusBalanceFC: true,
        bonusBlocked: true,
        bonusBlockedReason: true,
        isVerified: true,
        suspended: true,
        suspensionReason: true,
        tempBlocked: true,
        hasCompletedOnboarding: true,
        kycStatus: true,
        parentId: true,
        createdAt: true,
        referralCode: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Auto-credit $30 USD for existing clients who never received it
    if (
      user.role === 'client' &&
      user.realBalance === 0 &&
      user.bonusBalance === 0 &&
      user.realBalanceFC === 0 &&
      user.bonusBalanceFC === 0
    ) {
      try {
        await db.user.update({
          where: { id: user.id },
          data: { realBalance: 30 },
        })
        user.realBalance = 30
      } catch {}
    }

    // Auto-migrate old agent codes to AGT-{6digits} format
    if (user.role === 'agent' && user.phone) {
      const phone = user.phone.replace(/\D/g, '')
      const last6 = phone.slice(-6)
      const expectedCode = `AGT-${last6}`
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

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
