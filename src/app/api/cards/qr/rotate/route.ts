import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, verifyPinWithAttempts } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logSecurityEvent } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 3, key: `card-qr-rotate:${auth.userId}` })
    if (!limit.allowed) return rateLimitResponse(limit.resetIn)

    const body = await request.json().catch(() => null)
    const cardId = typeof body?.cardId === 'string' ? body.cardId.trim() : ''
    const pin = typeof body?.pin === 'string' ? body.pin : ''
    if (!cardId || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ success: false, message: 'Carte et code PIN valide requis' }, { status: 400 })
    }

    const card = await db.traitCard.findFirst({
      where: { id: cardId, userId: auth.userId },
      select: { id: true, status: true, cardType: true },
    })
    if (!card) return NextResponse.json({ success: false, message: 'Carte introuvable' }, { status: 404 })
    if (card.status !== 'active') {
      return NextResponse.json({ success: false, message: 'Seule une carte active peut renouveler son QR' }, { status: 409 })
    }

    const pinResult = await verifyPinWithAttempts(auth.userId, pin)
    if (!pinResult.valid) {
      return NextResponse.json({
        success: false,
        message: pinResult.blocked ? 'Compte temporairement bloqué. Contactez le support.' : 'Code PIN incorrect',
      }, { status: pinResult.blocked ? 423 : 401 })
    }

    const qrCode = randomUUID()
    const updated = await db.traitCard.updateMany({
      where: { id: card.id, userId: auth.userId, status: 'active' },
      data: { qrCode },
    })
    if (updated.count !== 1) {
      return NextResponse.json({ success: false, message: 'La carte a changé de statut. Réessayez.' }, { status: 409 })
    }

    await logSecurityEvent({
      userId: auth.userId,
      action: 'card_qr_rotated',
      details: JSON.stringify({ cardId: card.id, cardType: card.cardType }),
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent')?.slice(0, 300),
      riskLevel: 'medium',
    })

    return NextResponse.json({
      success: true,
      qrCode,
      message: 'QR renouvelé. L’ancien QR ne peut plus initier de demande de paiement.',
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Card QR rotation error:', error)
    return NextResponse.json({ success: false, message: 'Impossible de renouveler le QR pour le moment' }, { status: 500 })
  }
}
