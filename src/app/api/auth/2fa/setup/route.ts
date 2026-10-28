import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { generateSecret, getTOTPUri } from '@/lib/totp'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 })
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json({ success: false, message: '2FA déjà activé' }, { status: 400 })
    }

    const secret = generateSecret()
    const email = user.email || user.id
    const uri = getTOTPUri(secret, email)
    await db.user.update({
      where: { id: auth.userId },
      data: { twoFactorSecret: secret, twoFactorRecoveryCodes: [] },
    })

    return NextResponse.json({
      success: true,
      secret,
      uri,
      message: 'Scannez le QR code avec votre application d\'authentification',
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
