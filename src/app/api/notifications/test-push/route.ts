import { NextRequest, NextResponse } from 'next/server'
import { sendPushToAll } from '@/lib/push'
import { requireUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    // Only admin can trigger test push
    const { db } = await import('@/lib/db')
    const user = await db.user.findUnique({ where: { id: auth.userId }, select: { role: true } })
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const title = (body as any)?.title || 'Test TRAIT'
    const message = (body as any)?.message || 'Notifications push fonctionnent !'

    const result = await sendPushToAll({
      title,
      body: message,
      url: '/',
      tag: 'test-push',
    })

    return NextResponse.json({
      success: true,
      message: `Push envoyé: ${result.sent}/${result.total} (${result.failed} échecs)`,
      result,
    })
  } catch (error) {
    console.error('Push test error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
