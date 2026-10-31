import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { normalizeCurrency } from '@/lib/currency'

const PAGE_SIZE = 30
const MAX_PAGE = 50

type CurrencyTotals = { USD: number; CDF: number }
type FeeGroup = { currency: string; _sum: { fee: number | null } }

function sumByCurrency(groups: FeeGroup[]): CurrencyTotals {
  const totals: CurrencyTotals = { USD: 0, CDF: 0 }
  for (const group of groups) {
    totals[normalizeCurrency(group.currency)] += group._sum.fee ?? 0
  }
  totals.USD = Math.round(totals.USD * 100) / 100
  totals.CDF = Math.round(totals.CDF * 100) / 100
  return totals
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const rawPage = Number(new URL(request.url).searchParams.get('page') ?? 0)
    const page = Number.isInteger(rawPage) && rawPage >= 0 ? Math.min(rawPage, MAX_PAGE) : 0
    const offset = page * PAGE_SIZE
    const take = offset + PAGE_SIZE
    const withdrawalWhere = { fee: { gt: 0 }, status: { in: ['pending', 'completed'] } }
    const completedWithdrawalWhere = { fee: { gt: 0 }, status: 'completed' }

    const [
      sendCount,
      withdrawalCount,
      completedSends,
      completedWithdrawals,
      pendingWithdrawals,
      sends,
      withdrawals,
    ] = await Promise.all([
      db.transaction.count({ where: { type: 'send', status: 'completed', fee: { gt: 0 } } }),
      db.withdrawal.count({ where: withdrawalWhere }),
      db.transaction.groupBy({ by: ['currency'], where: { type: 'send', status: 'completed', fee: { gt: 0 } }, _sum: { fee: true } }),
      db.withdrawal.groupBy({ by: ['currency'], where: completedWithdrawalWhere, _sum: { fee: true } }),
      db.withdrawal.groupBy({ by: ['currency'], where: { fee: { gt: 0 }, status: 'pending' }, _sum: { fee: true } }),
      db.transaction.findMany({
        where: { type: 'send', status: 'completed', fee: { gt: 0 } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        select: {
          id: true,
          amount: true,
          fee: true,
          feeFromBonus: true,
          currency: true,
          status: true,
          createdAt: true,
          sender: { select: { name: true, pseudo: true, phone: true } },
          receiver: { select: { name: true, pseudo: true, phone: true } },
        },
      }),
      db.withdrawal.findMany({
        where: withdrawalWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        include: {
          user: { select: { name: true, pseudo: true, phone: true } },
          agent: { select: { name: true, pseudo: true, phone: true, agentCode: true, agentNumber: true } },
        },
      }),
    ])

    const records = [
      ...sends.map((transaction) => ({
        id: `send:${transaction.id}`,
        operation: 'send' as const,
        status: 'completed' as const,
        amount: transaction.amount,
        fee: transaction.fee,
        feeFromBonus: transaction.feeFromBonus === true,
        currency: normalizeCurrency(transaction.currency),
        createdAt: transaction.createdAt,
        userName: transaction.sender.name || transaction.sender.pseudo || transaction.sender.phone || 'Utilisateur TRAIT',
        userPhone: transaction.sender.phone,
        counterpartyName: transaction.receiver.name || transaction.receiver.pseudo || transaction.receiver.phone || 'Utilisateur TRAIT',
        counterpartyPhone: transaction.receiver.phone,
      })),
      ...withdrawals.map((withdrawal) => ({
        id: `withdrawal:${withdrawal.id}`,
        operation: 'withdrawal' as const,
        status: withdrawal.status as 'pending' | 'completed',
        amount: withdrawal.amount,
        fee: withdrawal.fee,
        feeFromBonus: withdrawal.feeFromBonus === true,
        currency: normalizeCurrency(withdrawal.currency),
        createdAt: withdrawal.createdAt,
        userName: withdrawal.user.name || withdrawal.user.pseudo || withdrawal.user.phone || 'Utilisateur TRAIT',
        userPhone: withdrawal.user.phone,
        counterpartyName: withdrawal.agent?.name || withdrawal.agent?.agentCode || withdrawal.agent?.agentNumber || 'Agent TRAIT',
        counterpartyPhone: withdrawal.agent?.phone,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))

    const pageRecords = records.slice(offset, offset + PAGE_SIZE).map((record) => ({
      ...record,
      createdAt: record.createdAt.toISOString(),
    }))
    const totalRecords = sendCount + withdrawalCount

    return NextResponse.json({
      success: true,
      page,
      pageSize: PAGE_SIZE,
      totalRecords,
      hasMore: totalRecords > offset + pageRecords.length,
      summary: {
        collected: sumByCurrency([...completedSends, ...completedWithdrawals]),
        pending: sumByCurrency(pendingWithdrawals),
      },
      records: pageRecords,
    })
  } catch (error) {
    console.error('Admin TRAIT fee ledger error:', error)
    return NextResponse.json({ success: false, message: 'Impossible de charger les frais TRAIT.' }, { status: 500 })
  }
}
