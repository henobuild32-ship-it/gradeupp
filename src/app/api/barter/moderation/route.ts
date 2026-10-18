import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// GET: list users blocked by current user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const blocks = await db.userBlock.findMany({
      where: { blockerId: auth.userId },
      include: { blocked: { select: { id: true, name: true, pseudo: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      blocks: blocks.map((b) => ({ id: b.id, user: b.blocked, createdAt: b.createdAt })),
    })
  } catch (error) {
    console.error('List blocks error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: block / unblock / report
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { action, userId, targetType, targetId, reason } = body as {
      action?: string
      userId?: string
      targetType?: string
      targetId?: string
      reason?: string
    }

    if (action === 'block') {
      if (!userId || userId === auth.userId) {
        return NextResponse.json({ success: false, message: 'Utilisateur invalide' }, { status: 400 })
      }
      const target = await db.user.findUnique({ where: { id: userId } })
      if (!target) {
        return NextResponse.json({ success: false, message: 'Utilisateur introuvable' }, { status: 404 })
      }
      await db.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: auth.userId, blockedId: userId } },
        create: { blockerId: auth.userId, blockedId: userId },
        update: {},
      })
      return NextResponse.json({ success: true, message: 'Utilisateur bloqué' })
    }

    if (action === 'unblock') {
      if (!userId) {
        return NextResponse.json({ success: false, message: 'Utilisateur invalide' }, { status: 400 })
      }
      await db.userBlock.deleteMany({ where: { blockerId: auth.userId, blockedId: userId } })
      return NextResponse.json({ success: true, message: 'Utilisateur débloqué' })
    }

    if (action === 'report') {
      if (!targetType || !targetId || !reason || !reason.trim()) {
        return NextResponse.json({ success: false, message: 'Motif du signalement requis' }, { status: 400 })
      }
      if (!['user', 'offer', 'message'].includes(targetType)) {
        return NextResponse.json({ success: false, message: 'Cible invalide' }, { status: 400 })
      }
      await db.userReport.create({
        data: {
          reporterId: auth.userId,
          targetType,
          targetId,
          reason: reason.trim().slice(0, 500),
        },
      })
      return NextResponse.json({ success: true, message: 'Signalement enregistré' })
    }

    return NextResponse.json({ success: false, message: 'Action invalide' }, { status: 400 })
  } catch (error) {
    console.error('Barter moderation error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
