import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { generateRecoveryCodes, verifyTOTP } from '@/lib/totp'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { code, action } = body as { code: string; action?: 'enable' | 'disable' }

    if (!code || typeof code !== 'string' || (action !== undefined && action !== 'enable' && action !== 'disable')) {
      return NextResponse.json({ success: false, message: 'Code TOTP requis' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    })

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ success: false, message: '2FA non configuré' }, { status: 400 })
    }

    const isValid = verifyTOTP(user.twoFactorSecret, code)
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Code invalide. Réessayez.' }, { status: 400 })
    }

    if (action === 'disable') {
      await db.user.update({
        where: { id: auth.userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
      })

      await db.notification.create({
        data: {
          userId: auth.userId,
          title: '2FA désactivé',
          message: 'L\'authentification à deux facteurs a été désactivée.',
          type: 'security',
        },
      })

      return NextResponse.json({ success: true, message: '2FA désactivé' })
    }

    if (action === 'enable' && !user.twoFactorEnabled) {
      const recovery = generateRecoveryCodes()
      await db.user.update({
        where: { id: auth.userId },
        data: { twoFactorEnabled: true, twoFactorRecoveryCodes: recovery.hashes },
      })

      await db.notification.create({
        data: {
          userId: auth.userId,
          title: '2FA activé',
          message: 'L\'authentification à deux facteurs a été activée sur votre compte.',
          type: 'security',
        },
      })

      return NextResponse.json({
        success: true,
        message: '2FA activé avec succès. Enregistrez vos codes de secours maintenant.',
        recoveryCodes: recovery.codes,
      }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    return NextResponse.json({ success: true, message: 'Code valide' })
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
