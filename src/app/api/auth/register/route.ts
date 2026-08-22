import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      phone,
      name,
      pseudo,
      country,
      role,
      pin,
      password,
      email,
      gender,
      city,
      address,
      photoId,
      referralCode, // optional referral code provided by user
    } = body as {
      phone: string
      name: string
      pseudo: string
      country: string
      role: 'client' | 'agent'
      pin: string
      password: string
      email?: string
      gender?: string
      city?: string
      address?: string
      photoId?: string
      referralCode?: string
    }

    if (!phone || !name || !pseudo || !role || !password) {
      return NextResponse.json(
        { success: false, message: 'Tous les champs requis doivent être remplis' },
        { status: 400 }
      )
    }

    if (role !== 'client' && role !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Le rôle doit être "client" ou "agent"' },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({
      where: { phone },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Ce numéro de téléphone est déjà enregistré' },
        { status: 409 }
      )
    }

    if (role === 'agent' && email) {
      const existingEmail = await db.user.findFirst({
        where: { email: email.trim().toLowerCase() },
      })
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Cette adresse email est déjà utilisée' },
          { status: 409 }
        )
      }
    }

    // Verify referral code if provided
    let referrerCode: string | null = null
    if (referralCode && referralCode.trim() !== '') {
      const trimmedCode = referralCode.trim().toUpperCase()
      const referrer = await db.user.findUnique({
        where: { referralCode: trimmedCode },
      })
      if (!referrer) {
        return NextResponse.json(
          { success: false, message: 'Code de parrainage invalide ou inexistant' },
          { status: 400 }
        )
      }
      referrerCode = trimmedCode
    }

    // Auto-generate a unique referral code for this user
    let userReferralCode: string
    let exists = true
    do {
      userReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase()
      const existing = await db.user.findUnique({
        where: { referralCode: userReferralCode },
      })
      exists = !!existing
    } while (exists)

    const isAgent = role === 'agent'
    const validationStatus = isAgent ? 'pending' : 'validated'
    const bonusBalance = isAgent ? 0 : 0
    const realBalanceCredit = isAgent ? 0 : 30

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Hash pin if provided
    let hashedPin: string | null = null
    if (pin) {
      const { hashPin } = await import('@/lib/auth')
      hashedPin = await hashPin(pin)
    }

    const user = await db.user.create({
      data: {
        phone,
        name,
        pseudo,
        country: country || 'CD',
        role,
        pin: hashedPin,
        password: hashedPassword,
        email: isAgent ? (email?.trim().toLowerCase() || null) : (email?.trim() || null),
        gender: gender || null,
        city: city?.trim() || null,
        address: address?.trim() || null,
        photoId: photoId || null,
        realBalance: realBalanceCredit,
        realBalanceFC: 0,
        bonusBalance,
        bonusBalanceFC: 0,
        validationStatus,
        referralCode: userReferralCode,
        referredBy: referrerCode,
      },
    })

    const response = NextResponse.json({
      success: true,
      message: 'Compte créé. Vérifiez votre code OTP.',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        pseudo: user.pseudo,
        email: user.email,
        country: user.country,
        realBalance: user.realBalance,
        realBalanceFC: user.realBalanceFC,
        bonusBalance: user.bonusBalance,
        bonusBalanceFC: user.bonusBalanceFC,
        role: user.role,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        isVerified: user.isVerified,
        referralCode: user.referralCode,
      },
    })
    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
