import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }

    // Get last 50 transactions where user is sender
    const transactions = await prisma.transaction.findMany({
      where: {
        senderId: auth.userId,
        receiverId: { not: auth.userId },
        status: 'completed',
        type: { in: ['send', 'payment_link'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        receiverId: true,
        amount: true,
        currency: true,
        createdAt: true,
      },
    })

    if (!transactions.length) {
      return NextResponse.json({ success: true, contacts: [] })
    }

    // Get unique receiver IDs preserving first occurrence (most recent)
    const seen = new Set<string>()
    const uniqueReceiverIds: string[] = []
    const txByReceiver = new Map<string, typeof transactions[0]>()

    for (const tx of transactions) {
      if (!seen.has(tx.receiverId)) {
        seen.add(tx.receiverId)
        uniqueReceiverIds.push(tx.receiverId)
        txByReceiver.set(tx.receiverId, tx)
      }
    }

    const users = await prisma.user.findMany({
      where: { id: { in: uniqueReceiverIds }, deletedAt: null },
      select: { id: true, name: true, phone: true },
    })

    const contacts = uniqueReceiverIds
      .map((id) => {
        const user = users.find((u) => u.id === id)
        const tx = txByReceiver.get(id)
        if (!user || !tx) return null
        return {
          id: user.id,
          name: user.name || user.phone,
          phone: user.phone,
          lastAmount: tx.amount,
          lastCurrency: tx.currency,
          lastDate: tx.createdAt.toISOString(),
        }
      })
      .filter(Boolean)

    return NextResponse.json({ success: true, contacts })
  } catch (error) {
    console.error('Contacts recent GET error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
