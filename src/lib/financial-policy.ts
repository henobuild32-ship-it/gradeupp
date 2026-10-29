import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { calculateWithdrawalUsage, FINANCIAL_POLICY, getDayWindow, isWithinDailyTransactionLimit, type DayWindow, type FinancialPolicy } from './financial-policy-core'

export { FINANCIAL_POLICY, getDayWindow, type DayWindow, type FinancialPolicy } from './financial-policy-core'

export const FINANCIAL_POLICY_CONFIG_KEY = 'financial_policy_v1'
function validPolicy(value: unknown): value is FinancialPolicy {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return Number.isInteger(candidate.dailyTransactionLimit)
    && Number(candidate.dailyTransactionLimit) > 0
    && Number(candidate.dailyTransactionLimit) <= 1_000
    && Number.isFinite(candidate.dailyWithdrawalLimitUsd)
    && Number(candidate.dailyWithdrawalLimitUsd) > 0
    && Number.isFinite(candidate.dailyWithdrawalLimitCdf)
    && Number(candidate.dailyWithdrawalLimitCdf) > 0
    && Number.isInteger(candidate.withdrawalFeeBasisPoints)
    && Number(candidate.withdrawalFeeBasisPoints) >= 0
    && Number(candidate.withdrawalFeeBasisPoints) <= 10_000
    && Number.isInteger(candidate.internationalSendFeeBasisPoints)
    && Number(candidate.internationalSendFeeBasisPoints) >= 0
    && Number(candidate.internationalSendFeeBasisPoints) <= 10_000
    && candidate.timezone === FINANCIAL_POLICY.timezone
}

export async function getFinancialPolicy(): Promise<FinancialPolicy> {
  try {
    const row = await db.systemConfig.findUnique({ where: { key: FINANCIAL_POLICY_CONFIG_KEY } })
    if (!row) return FINANCIAL_POLICY
    const parsed: unknown = JSON.parse(row.value)
    return validPolicy(parsed) ? parsed : FINANCIAL_POLICY
  } catch {
    return FINANCIAL_POLICY
  }
}

export async function setFinancialPolicy(value: unknown): Promise<FinancialPolicy> {
  if (!validPolicy(value)) throw new Error('Configuration financière invalide')
  await db.systemConfig.upsert({
    where: { key: FINANCIAL_POLICY_CONFIG_KEY },
    update: { value: JSON.stringify(value) },
    create: { key: FINANCIAL_POLICY_CONFIG_KEY, value: JSON.stringify(value) },
  })
  return value
}

export async function lockDailyFinancialOperations(tx: Prisma.TransactionClient, userId: string) {
  // Serializes all TRAIT operations using this policy for the same user until
  // the surrounding database transaction commits or rolls back.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(913744, hashtext(${userId}))`
}

export async function readDailyTransactionUsage(
  tx: Prisma.TransactionClient,
  userId: string,
  window = getDayWindow(),
) {
  // A withdrawal is represented in both Withdrawal and Transaction; count the
  // single transaction ledger row so it is not counted twice.
  const count = await tx.transaction.count({
    where: {
      senderId: userId,
      createdAt: { gte: window.start, lt: window.end },
      status: { in: ['pending', 'completed', 'processing'] },
    },
  })
  return count
}

export async function checkDailyTransactionLimit(
  tx: Prisma.TransactionClient,
  userId: string,
  policy: FinancialPolicy,
  window = getDayWindow(),
) {
  const count = await readDailyTransactionUsage(tx, userId, window)
  return { allowed: isWithinDailyTransactionLimit(count, policy.dailyTransactionLimit), count, limit: policy.dailyTransactionLimit, remaining: Math.max(0, policy.dailyTransactionLimit - count) }
}

export async function checkDailyWithdrawalLimit(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  currency: string,
  exchangeRate: number,
  policy: FinancialPolicy,
  window = getDayWindow(),
) {
  const withdrawals = await tx.withdrawal.findMany({
    where: { userId, createdAt: { gte: window.start, lt: window.end }, status: { in: ['pending', 'completed', 'processing'] } },
    select: { amount: true, currency: true },
  })
  return calculateWithdrawalUsage(withdrawals, amount, currency, exchangeRate, policy.dailyWithdrawalLimitUsd, policy.dailyWithdrawalLimitCdf)
}

export async function getUserDailyLimits(userId: string, now = new Date()) {
  const policy = await getFinancialPolicy()
  const window = getDayWindow(now, policy.timezone)
  const [count, withdrawals] = await Promise.all([
    db.transaction.count({ where: { senderId: userId, createdAt: { gte: window.start, lt: window.end }, status: { in: ['pending', 'completed', 'processing'] } } }),
    db.withdrawal.findMany({ where: { userId, createdAt: { gte: window.start, lt: window.end }, status: { in: ['pending', 'completed', 'processing'] } }, select: { amount: true, currency: true } }),
  ])
  const exchangeRateRow = await db.systemConfig.findUnique({ where: { key: 'exchange_rate_usd_cdf' }, select: { value: true } }).catch(() => null)
  const rateValue = Number(exchangeRateRow?.value ?? 2300)
  const rate = Number.isFinite(rateValue) && rateValue > 0 ? rateValue : 2300
  const usage = calculateWithdrawalUsage(withdrawals, 0, 'USD', rate, policy.dailyWithdrawalLimitUsd, policy.dailyWithdrawalLimitCdf)
  return {
    timezone: policy.timezone,
    fees: {
      withdrawalBasisPoints: policy.withdrawalFeeBasisPoints,
      internationalSendBasisPoints: policy.internationalSendFeeBasisPoints,
    },
    transactions: { used: count, limit: policy.dailyTransactionLimit, remaining: Math.max(0, policy.dailyTransactionLimit - count) },
    withdrawal: {
      usedUsd: usage.usedUsd,
      limitUsd: policy.dailyWithdrawalLimitUsd,
      remainingUsd: usage.remainingUsd,
      usedCdf: usage.usedCdf,
      limitCdf: policy.dailyWithdrawalLimitCdf,
      remainingCdf: usage.remainingCdf,
    },
  }
}
