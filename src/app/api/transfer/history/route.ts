import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const type = searchParams.get('type') || 'all'
    const cursor = searchParams.get('cursor')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    if (auth.userId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      )
    }

    const skip = cursor ? 1 : (page - 1) * PAGE_SIZE
    const take = PAGE_SIZE + 1

    type HistoryItem = {
      id: string
      type: string
      amount: number
      fee: number
      currency: string
      status: string
      description: string
      createdAt: Date
      counterparty?: { id: string; phone: string; name: string | null; pseudo: string | null } | null
    }

    const userInclude = { select: { id: true, phone: true, name: true, pseudo: true } }
    const orderBy = { createdAt: 'desc' as const }

    const cursorFilter = cursor ? { createdAt: { lt: new Date(cursor) } } : {}

    // Transferts uniquement — dépôts/retraits viennent des tables dédiées (pas de doublon)
    const sentTransactions = await db.transaction.findMany({
      where: {
        senderId: userId,
        type: { notIn: ['deposit', 'withdrawal'] },
        ...cursorFilter,
      },
      include: { sender: userInclude, receiver: userInclude },
      orderBy,
      take,
      skip,
    })

    const receivedTransactions = await db.transaction.findMany({
      where: {
        receiverId: userId,
        type: { notIn: ['deposit', 'withdrawal'] },
        ...cursorFilter,
      },
      include: { sender: userInclude, receiver: userInclude },
      orderBy,
      take,
      skip,
    })

    const deposits = await db.deposit.findMany({
      where: { userId, ...cursorFilter },
      include: {
        agent: { select: { id: true, agentCode: true, agentNumber: true, name: true, pseudo: true } },
      },
      orderBy,
      take,
      skip,
    })

    const withdrawals = await db.withdrawal.findMany({
      where: { userId, ...cursorFilter },
      include: {
        agent: { select: { id: true, agentCode: true, agentNumber: true, name: true, pseudo: true } },
      },
      orderBy,
      take,
      skip,
    })

    const { depositMethodLabel, withdrawalMethodLabel, formatAmount } = await import('@/lib/tx-labels')

    const agentLabel = (agent: { agentCode: string | null; agentNumber: string | null; name: string | null; pseudo: string | null } | null | undefined) => {
      if (!agent) return null
      return agent.agentCode || agent.agentNumber || agent.name || agent.pseudo || null
    }

    const sentItems: HistoryItem[] = sentTransactions.map((t) => ({
      id: t.id, type: 'send', amount: t.amount, fee: t.fee, currency: t.currency,
      status: t.status,
      description: t.description || `Transfert de ${formatAmount(t.amount, t.currency)} vers ${t.receiver?.phone || 'inconnu'}`,
      createdAt: t.createdAt, counterparty: t.receiver,
    }))

    const receivedItems: HistoryItem[] = receivedTransactions.map((t) => ({
      id: t.id, type: 'receive', amount: t.amount, fee: 0, currency: t.currency,
      status: t.status,
      description: t.description || `Réception de ${formatAmount(t.amount, t.currency)} de ${t.sender?.phone || 'inconnu'}`,
      createdAt: t.createdAt, counterparty: t.sender,
    }))

    const depositItems: HistoryItem[] = deposits.map((d) => {
      const a = agentLabel(d.agent)
      return {
        id: d.id, type: 'deposit', amount: d.amount, fee: 0, currency: d.currency,
        status: d.status,
        description: a
          ? `${depositMethodLabel(d.method)} de ${formatAmount(d.amount, d.currency)} — agent ${a}`
          : `${depositMethodLabel(d.method)} de ${formatAmount(d.amount, d.currency)}`,
        createdAt: d.createdAt,
      }
    })

    const withdrawalItems: HistoryItem[] = withdrawals.map((w) => {
      const a = agentLabel(w.agent)
      return {
        id: w.id, type: 'withdrawal', amount: w.amount, fee: w.fee, currency: w.currency,
        status: w.status,
        description: a
          ? `${withdrawalMethodLabel(w.method)} de ${formatAmount(w.amount, w.currency)} — agent ${a}`
          : `${withdrawalMethodLabel(w.method)} de ${formatAmount(w.amount, w.currency)}`,
        createdAt: w.createdAt,
      }
    })

    let allItems = [...sentItems, ...receivedItems, ...depositItems, ...withdrawalItems]

    if (type !== 'all') {
      allItems = allItems.filter((item) => item.type === type)
    }

    allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const hasMore = allItems.length > PAGE_SIZE
    const history = allItems.slice(0, PAGE_SIZE)
    const nextCursor = hasMore ? history[history.length - 1]?.createdAt.toISOString() : null

    return NextResponse.json({
      success: true,
      history,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        hasMore,
        nextCursor,
      },
    })
  } catch (error) {
    console.error('Transfer history error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
