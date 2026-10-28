import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { generateRecoveryCodes, verifyTOTP } from '@/lib/totp'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 5, key: `2fa-recovery:${auth.userId}` })
    if (!limit.allowed) return rateLimitResponse(limit.resetIn)

    const body = await request.json().catch(() => ({}))
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ success: false, message: 'Saisissez votre code actuel à six chiffres.' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, twoFactorEnabled: true, twoFactorSecret: true },
    })
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ success: false, message: 'Activez d’abord la validation en deux étapes.' }, { status: 409 })
    }
    if (!verifyTOTP(user.twoFactorSecret, code)) {
      return NextResponse.json({ success: false, message: 'Code invalide.' }, { status: 400 })
    }

    const recovery = generateRecoveryCodes()
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorRecoveryCodes: recovery.hashes },
    })
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Codes de secours renouvelés',
        message: 'Vos anciens codes de secours ne fonctionnent plus. Enregistrez les nouveaux codes en lieu sûr.',
        type: 'security',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Nouveaux codes générés. Les anciens codes ne sont plus valides.',
      recoveryCodes: recovery.codes,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('2FA recovery code generation error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
