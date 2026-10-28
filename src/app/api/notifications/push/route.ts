import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

function pushIsConfigured() {
  return Boolean(
    (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    && process.env.VAPID_PRIVATE_KEY,
  )
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const endpoint = new URL(request.url).searchParams.get('endpoint')
    const subscribed = endpoint
      ? Boolean(await db.pushSubscription.findFirst({ where: { endpoint, userId: auth.userId }, select: { endpoint: true } }))
      : false

    return NextResponse.json(
      { success: true, available: pushIsConfigured(), subscribed },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('Push status error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    if (!pushIsConfigured()) {
      return NextResponse.json(
        { success: false, code: 'PUSH_NOT_CONFIGURED', message: 'Les notifications push ne sont pas configurées sur ce serveur.' },
        { status: 503 },
      )
    }

    const body = await request.json().catch(() => null)
    const { endpoint, p256dh, auth: authKey } = body || {}

    if (
      typeof endpoint !== 'string' || endpoint.length > 2048
      || typeof p256dh !== 'string' || p256dh.length < 40 || p256dh.length > 200
      || typeof authKey !== 'string' || authKey.length < 16 || authKey.length > 100
    ) {
      return NextResponse.json({ success: false, message: 'Données de subscription invalides' }, { status: 400 })
    }

    try {
      if (new URL(endpoint).protocol !== 'https:') throw new Error('HTTPS required')
    } catch {
      return NextResponse.json({ success: false, message: 'Endpoint push invalide' }, { status: 400 })
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      // A browser push endpoint belongs to the currently authenticated account on this device.
      // Reassign it when accounts change so notifications cannot remain routed to the prior user.
      update: { p256dh, auth: authKey, userId: auth.userId },
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
