import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { broadcastNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth
    const adminId = auth.userId

    const body = await request.json().catch(() => ({}))
    const { amount = 30 } = body as { amount?: number }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Montant invalide' },
        { status: 400 }
      )
    }

    const clients = await db.user.findMany({
      where: { role: 'client' },
      select: { id: true, name: true, phone: true, realBalance: true },
    })

    if (clients.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Aucun client trouvé' },
        { status: 404 }
      )
    }

    let credited = 0
    const batchSize = 50

    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (client) => {
          try {
            await db.user.update({
              where: { id: client.id },
              data: { realBalance: { increment: amount } },
            })
            credited++
          } catch (err) {
            console.error(`Failed to credit user ${client.id}:`, err)
          }
        })
      )
    }

    await db.adminActivityLog.create({
      data: {
        adminId,
        action: 'bulk_credit_clients',
        target: 'all_clients',
        details: `Crédit de ${amount} USD en solde réel pour ${credited}/${clients.length} clients`,
      },
    })

    try {
      await broadcastNotification(
        'Bonus de bienvenue',
        `Vous avez reçu ${amount} USD en solde réel ! Profitez de vos services TRAIT.`,
        'general',
        true
      )
    } catch {}

    return NextResponse.json({
      success: true,
      message: `${credited} clients crédités de ${amount} USD`,
      credited,
      total: clients.length,
      amount,
    })
  } catch (error) {
    console.error('Bulk credit error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
