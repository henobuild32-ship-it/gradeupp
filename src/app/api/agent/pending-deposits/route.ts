import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const agent = await db.user.findUnique({
      where: { id: auth.userId },
      select: { role: true, validationStatus: true, suspended: true },
    })

    if (!agent || agent.role !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux agents' },
        { status: 403 }
      )
    }

    if (agent.suspended || agent.validationStatus !== 'validated') {
      return NextResponse.json(
        { success: false, message: 'Votre compte agent n\'est pas actif' },
        { status: 403 }
      )
    }

    const deposits = await db.deposit.findMany({
      where: { status: 'pending', agentId: auth.userId },
      include: {
        user: { select: { name: true, pseudo: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      deposits: deposits.map((d) => ({
        id: d.id,
        userId: d.userId,
        userName: d.user?.name || null,
        userPseudo: d.user?.pseudo || null,
        userPhone: d.user?.phone || '',
        amount: d.amount,
        currency: d.currency,
        method: d.method,
        status: d.status,
        createdAt: d.createdAt,
      })),
    })
  } catch (error) {
    console.error('Pending deposits error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
