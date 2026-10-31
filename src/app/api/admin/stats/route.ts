import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { normalizeCurrency } from '@/lib/currency';

function sumFeesByCurrency(rows: Array<{ currency: string; _sum: { fee: number | null } }>) {
  return rows.reduce((totals, row) => {
    const currency = normalizeCurrency(row.currency);
    totals[currency] += row._sum.fee ?? 0;
    return totals;
  }, { USD: 0, CDF: 0 });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const [
      totalUsers,
      totalAgents,
      suspendedUsers,
      totalTransactions,
      totalDeposits,
      totalWithdrawals,
      totalProducts,
      activeProducts,
      totalBarterOffers,
      activeBarterOffers,
      todayTransactions,
      todayUsers,
      pendingAgents,
      pendingDevelopers,
      approvedDevelopers,
      totalApiCommission,
      internationalTransfers,
      pendingSellers,
      totalSellers,
      openReports,
    ] = await Promise.all([
      db.user.count({ where: { deletedAt: null, role: 'client' } }),
      db.user.count({ where: { deletedAt: null, role: 'agent' } }),
      db.user.count({ where: { deletedAt: null, suspended: true } }),
      db.transaction.count(),
      db.deposit.count({ where: { status: 'completed' } }),
      db.withdrawal.count({ where: { status: 'completed' } }),
      db.marketplaceProduct.count(),
      db.marketplaceProduct.count({ where: { active: true } }),
      db.barterOffer.count(),
      db.barterOffer.count({ where: { status: 'active' } }),
      db.transaction.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.user.count({ where: { deletedAt: null, role: 'agent', validationStatus: 'pending' } }),
      db.developer.count({ where: { status: 'pending' } }),
      db.developer.count({ where: { status: 'approved' } }),
      db.apiCommission.aggregate({ _sum: { amount: true } }),
      db.internationalTransfer.count(),
      db.user.count({ where: { deletedAt: null, role: 'seller', validationStatus: 'pending' } }),
      db.user.count({ where: { deletedAt: null, role: 'seller' } }),
      (db.userReport as any).count({ where: { status: { in: ['new', 'reviewing', 'info_requested', 'pending'] } } }),
    ]);

    const completedTxs = await db.transaction.findMany({
      where: { status: 'completed', OR: [{ type: 'send' }, { type: 'withdrawal' }, { type: 'deposit' }] },
      select: { amount: true, fee: true, currency: true, type: true },
    });

    const totalVolume = completedTxs.reduce((s, t) => s + (t.amount + (t.fee ?? 0)), 0);
    const sendVolume = completedTxs
      .filter((t) => t.type === 'send')
      .reduce((s, t) => s + t.amount, 0);

    const [completedSendFees, completedWithdrawalFees, pendingWithdrawalFees] = await Promise.all([
      db.transaction.groupBy({
        by: ['currency'],
        where: { type: 'send', status: 'completed', fee: { gt: 0 } },
        _sum: { fee: true },
      }),
      db.withdrawal.groupBy({
        by: ['currency'],
        where: { status: 'completed', fee: { gt: 0 } },
        _sum: { fee: true },
      }),
      db.withdrawal.groupBy({
        by: ['currency'],
        where: { status: 'pending', fee: { gt: 0 } },
        _sum: { fee: true },
      }),
    ]);
    const sendFeeTotals = sumFeesByCurrency(completedSendFees);
    const withdrawalFeeTotals = sumFeesByCurrency(completedWithdrawalFees);
    const pendingWithdrawalFeeTotals = sumFeesByCurrency(pendingWithdrawalFees);

    const recentLogs = await db.adminActivityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { name: true, username: true } } },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyTransactions = await db.transaction.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const monthlyDeposits = await db.deposit.aggregate({
      where: { status: 'completed', createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    });

    const monthlyWithdrawals = await db.withdrawal.aggregate({
      where: { status: 'completed', createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalAgents,
        suspendedUsers,
        totalTransactions,
        totalDeposits,
        totalWithdrawals,
        totalProducts,
        activeProducts,
        totalBarterOffers,
        activeBarterOffers,
        todayTransactions,
        todayUsers,
        pendingAgents,
        pendingDevelopers,
        approvedDevelopers,
        totalApiCommission: totalApiCommission._sum.amount ?? 0,
        internationalTransfers,
        pendingSellers,
        totalSellers,
        openReports,
        totalVolume,
        sendVolume,
        traitFeesUsd: Number((sendFeeTotals.USD + withdrawalFeeTotals.USD).toFixed(2)),
        traitFeesCdf: Number((sendFeeTotals.CDF + withdrawalFeeTotals.CDF).toFixed(2)),
        pendingWithdrawalFeesUsd: Number(pendingWithdrawalFeeTotals.USD.toFixed(2)),
        pendingWithdrawalFeesCdf: Number(pendingWithdrawalFeeTotals.CDF.toFixed(2)),
        monthlyTransactions,
        monthlyDepositVolume: monthlyDeposits._sum.amount ?? 0,
        monthlyWithdrawalVolume: monthlyWithdrawals._sum.amount ?? 0,
        recentLogs,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
