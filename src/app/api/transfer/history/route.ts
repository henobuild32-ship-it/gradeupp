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

    const skip = cursor ? 0 : Math.max(0, (page - 1) * PAGE_SIZE)
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
      counterparty?: { id: string; phone: string | null; name: string | null; pseudo: string | null } | null
    }

    const userInclude = { select: { id: true, phone: true, name: true, pseudo: true, deletedAt: true } }
    const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
    const separator = cursor?.lastIndexOf('|') ?? -1
    const cursorDateText = separator > 0 ? cursor!.slice(0, separator) : cursor
    const cursorId = separator > 0 ? cursor!.slice(separator + 1) : null
    const cursorDate = cursorDateText ? new Date(cursorDateText) : null
    const cursorFilter = cursorDate && Number.isFinite(cursorDate.getTime())
      ? cursorId
        ? { OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: cursorId } }] }
        : { createdAt: { lt: cursorDate } }
      : {}

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
        agent: { select: { id: true, agentCode: true, agentNumber: true, name: true, pseudo: true, deletedAt: true } },
      },
      orderBy,
      take,
      skip,
    })

    const withdrawals = await db.withdrawal.findMany({
      where: { userId, ...cursorFilter },
      include: {
        agent: { select: { id: true, agentCode: true, agentNumber: true, name: true, pseudo: true, deletedAt: true } },
      },
      orderBy,
      take,
      skip,
    })

    const { depositMethodLabel, withdrawalMethodLabel, formatAmount } = await import('@/lib/tx-labels')

    const agentLabel = (agent: { agentCode: string | null; agentNumber: string | null; name: string | null; pseudo: string | null; deletedAt: Date | null } | null | undefined) => {
      if (!agent || agent.deletedAt) return null
      return agent.agentCode || agent.agentNumber || agent.name || agent.pseudo || null
    }

    const visibleCounterparty = (person: NonNullable<HistoryItem['counterparty']> & { deletedAt?: Date | null }) =>
      person.deletedAt ? { id: person.id, name: null, pseudo: null, phone: null } : person

    const sentItems: HistoryItem[] = sentTransactions.map((t) => ({
      id: t.id, type: 'send', amount: t.amount, fee: t.fee, currency: t.currency,
      status: t.status,
      description: t.description || `Transfert de ${formatAmount(t.amount, t.currency)} vers ${t.receiver?.deletedAt ? 'compte supprimé' : t.receiver?.phone || 'inconnu'}`,
      createdAt: t.createdAt, counterparty: t.receiver ? visibleCounterparty(t.receiver) : null,
    }))

    const receivedItems: HistoryItem[] = receivedTransactions.map((t) => ({
      id: t.id, type: 'receive', amount: t.amount, fee: 0, currency: t.currency,
      status: t.status,
      description: t.description || `Réception de ${formatAmount(t.amount, t.currency)} de ${t.sender?.deletedAt ? 'compte supprimé' : t.sender?.phone || 'inconnu'}`,
      createdAt: t.createdAt, counterparty: t.sender ? visibleCounterparty(t.sender) : null,
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

    allItems.sort((a, b) => {
      const dateOrder = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return dateOrder || b.id.localeCompare(a.id)
    })

    const hasMore = allItems.length > PAGE_SIZE
    const history = allItems.slice(0, PAGE_SIZE)
    const lastItem = history[history.length - 1]
    const nextCursor = hasMore && lastItem ? `${lastItem.createdAt.toISOString()}|${lastItem.id}` : null

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
