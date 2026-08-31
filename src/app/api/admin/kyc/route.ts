import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    const users = await db.user.findMany({
      where: {
        kycStatus: status,
        kycDocumentUrl: { not: null },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        kycStatus: true,
        kycSubmittedAt: true,
        kycDocumentType: true,
        kycDocumentUrl: true,
        kycSelfieUrl: true,
        kycData: true,
      },
      orderBy: { kycSubmittedAt: 'asc' },
    })

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error('Admin KYC list error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { userId, action, rejectReason } = body as {
      userId: string
      action: 'approve' | 'reject'
      rejectReason?: string
    }

    if (!userId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants ou invalides' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, kycStatus: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 })
    }

    if (user.kycStatus !== 'pending') {
      return NextResponse.json({ success: false, message: 'Ce KYC n\'est pas en attente' }, { status: 400 })
    }

    const now = new Date()

    if (action === 'approve') {
      await db.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'verified',
          kycVerifiedAt: now,
          kycRejectReason: null,
        },
      })

      await db.notification.create({
        data: {
          userId,
          title: 'KYC approuvé',
          message: 'Votre vérification d\'identité a été approuvée. Vous pouvez maintenant effectuer des transactions.',
          type: 'security',
        },
      })

      try {
        const { sendPushToUser } = await import('@/lib/push')
        await sendPushToUser(userId, {
          title: 'KYC approuvé',
          body: 'Votre vérification d\'identité a été approuvée. Vous pouvez maintenant effectuer des transactions.',
          url: '/kyc-verification',
        })
      } catch {}

      return NextResponse.json({ success: true, message: 'KYC approuvé' })
    }

    if (action === 'reject') {
      await db.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'rejected',
          kycVerifiedAt: null,
          kycRejectReason: rejectReason || 'Documents non conformes',
        },
      })

      await db.notification.create({
        data: {
          userId,
          title: 'KYC refusé',
          message: `Votre vérification d'identité a été refusée. Motif: ${rejectReason || 'Documents non conformes'}. Vous pouvez soumettre une nouvelle demande.`,
          type: 'security',
        },
      })

      try {
        const { sendPushToUser } = await import('@/lib/push')
        await sendPushToUser(userId, {
          title: 'KYC refusé',
          body: `Votre vérification d'identité a été refusée. ${rejectReason || 'Documents non conformes'}.`,
          url: '/kyc-verification',
        })
      } catch {}

      return NextResponse.json({ success: true, message: 'KYC refusé' })
    }

    return NextResponse.json({ success: false, message: 'Action non reconnue' }, { status: 400 })
  } catch (error) {
    console.error('Admin KYC validation error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
