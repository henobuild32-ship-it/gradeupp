import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sendDeveloperApiKeysEmail } from '@/lib/email/service'

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (admin instanceof NextResponse) return admin

    const body = await request.json()
    const developerId = typeof body.developerId === 'string' ? body.developerId : ''
    const publicKey = typeof body.publicKey === 'string' ? body.publicKey : ''
    const secretKey = typeof body.secretKey === 'string' ? body.secretKey : ''
    if (!developerId || !publicKey || !secretKey) {
      return NextResponse.json({ success: false, error: 'Clés et développeur requis' }, { status: 400 })
    }

    const developer = await db.developer.findUnique({
      where: { id: developerId },
      select: { id: true, fullName: true, email: true, appName: true, status: true },
    })
    if (!developer || developer.status !== 'approved') {
      return NextResponse.json({ success: false, error: 'Développeur non approuvé' }, { status: 404 })
    }

    const apiKey = await db.developerApiKey.findFirst({
      where: { developerId, publicKey, isActive: true, mode: 'live' },
      select: { id: true, publicKey: true, secretKey: true, webhookUrl: true },
    })
    const supplied = Buffer.from(secretKey)
    const stored = Buffer.from(apiKey?.secretKey || '')
    if (!apiKey || supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) {
      return NextResponse.json({ success: false, error: 'Clé API invalide ou révoquée' }, { status: 403 })
    }

    const sent = await sendDeveloperApiKeysEmail(
      developer.email,
      developer.fullName,
      developer.appName,
      apiKey.publicKey,
      apiKey.secretKey,
      apiKey.webhookUrl,
    )
    if (!sent) {
      return NextResponse.json({ success: false, error: 'Le service email est indisponible. Les clés n’ont pas été envoyées.' }, { status: 503 })
    }

    await db.adminActivityLog.create({
      data: {
        adminId: admin.userId,
        action: 'send_developer_api_keys',
        target: developer.id,
        details: `Clés API envoyées à ${developer.email} pour ${developer.appName}`,
      },
    })

    return NextResponse.json({ success: true, message: `Clés envoyées à ${developer.email}`, emailTo: developer.email })
  } catch (error) {
    console.error('Send developer keys email error:', error)
    return NextResponse.json({ success: false, error: 'Erreur lors de l’envoi des clés' }, { status: 500 })
  }
}
