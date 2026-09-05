import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAndMigratePin, requireUser } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit({ windowMs: 60000, maxRequests: 10, key: `pin:${auth.userId}:${ip}` })
    if (!rl.allowed) return rateLimitResponse(rl.resetIn)

    const body = await request.json()
    const { userId, pin } = body as { userId: string; pin: string }

    if (!userId) {
      return NextResponse.json({ success: false, message: 'ID utilisateur requis' }, { status: 400 })
    }

    if (auth.userId !== userId) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 })
    }

    if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 8 || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ success: false, message: 'Code PIN invalide' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })

    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 })
    }

    if (!user.pin) {
      return NextResponse.json(
        { success: false, message: 'Aucun code PIN défini.' },
        { status: 400 }
      )
    }

    if (user.tempBlocked) {
      return NextResponse.json(
        { success: false, message: 'Compte temporairement bloqué. Contactez le support.' },
        { status: 423 }
      )
    }

    const isValid = await verifyAndMigratePin(user.id, pin, user.pin)

    if (!isValid) {
      const newAttempts = user.pinAttempts + 1

      if (newAttempts >= 5) {
        await db.user.update({
          where: { id: userId },
          data: { tempBlocked: true, pinAttempts: 0 },
        })
        return NextResponse.json(
          { success: false, message: 'Trop de tentatives. Compte bloqué temporairement.' },
          { status: 429 }
        )
      }

      await db.user.update({
        where: { id: userId },
        data: { pinAttempts: newAttempts },
      })

      return NextResponse.json(
        { success: false, message: `Code PIN incorrect. ${5 - newAttempts} tentative(s) restante(s).` },
        { status: 401 }
      )
    }

    if (user.pinAttempts > 0) {
      await db.user.update({
        where: { id: userId },
        data: { pinAttempts: 0 },
      })
    }

    return NextResponse.json({ success: true, message: 'Code PIN vérifié' })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
