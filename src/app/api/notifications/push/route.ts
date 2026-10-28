import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { endpoint, p256dh, auth: authKey } = body

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json({ success: false, message: 'Données de subscription invalides' }, { status: 400 })
    }

    const existing = await db.pushSubscription.findUnique({ where: { endpoint }, select: { userId: true } })
    if (existing && existing.userId !== auth.userId) {
      return NextResponse.json({ success: false, message: 'Cet appareil est déjà associé à un autre compte.' }, { status: 409 })
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth: authKey },
      create: { endpoint, p256dh, auth: authKey, userId: auth.userId },
    })

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (endpoint) {
      await db.pushSubscription.deleteMany({ where: { endpoint, userId: auth.userId } })
    } else {
      await db.pushSubscription.deleteMany({ where: { userId: auth.userId } })
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
