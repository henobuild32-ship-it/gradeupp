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
        pin: true,
        biometricEnabled: true,
        unlockMethod: true,
        twoFactorEnabled: true,
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

    // Ne jamais renvoyer le hash du PIN au client — exposer pinSet (booléen)
    const pinSet = !!user.pin
    const { pin: _pinHash, ...safeUser } = user
    const userOut = { ...safeUser, pinSet }

    return NextResponse.json({ success: true, user: userOut })
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
