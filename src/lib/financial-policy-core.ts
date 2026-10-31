import { convertCurrencyAmount, normalizeCurrency, roundCurrencyAmount } from './currency.ts'

export const TRAIT_WALLET_FEE_BASIS_POINTS = 100

export const FINANCIAL_POLICY = Object.freeze({
  dailyTransactionLimit: 30,
  dailyWithdrawalLimitUsd: 9_900,
  dailyWithdrawalLimitCdf: 22_770_000,
  withdrawalFeeBasisPoints: TRAIT_WALLET_FEE_BASIS_POINTS,
  internationalSendFeeBasisPoints: TRAIT_WALLET_FEE_BASIS_POINTS,
  timezone: 'Africa/Kinshasa',
})

export interface FinancialPolicy {
  dailyTransactionLimit: number
  dailyWithdrawalLimitUsd: number
  dailyWithdrawalLimitCdf: number
  withdrawalFeeBasisPoints: number
  internationalSendFeeBasisPoints: number
  timezone: 'Africa/Kinshasa'
}

export type DayWindow = { start: Date; end: Date }

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) }
}

function utcAtLocalMidnight(year: number, month: number, day: number, timezone: string): Date {
  const guess = Date.UTC(year, month - 1, day)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(guess))
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]))
  const representedAsUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second)
  return new Date(guess - (representedAsUtc - guess))
}

export function getDayWindow(now = new Date(), timezone = FINANCIAL_POLICY.timezone): DayWindow {
  const { year, month, day } = localDateParts(now, timezone)
  const start = utcAtLocalMidnight(year, month, day, timezone)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  const end = utcAtLocalMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), timezone)
  return { start, end }
}

export function isWithinDailyTransactionLimit(count: number, limit: number): boolean {
  return Number.isInteger(count) && count >= 0 && Number.isInteger(limit) && limit > 0 && count < limit
}

export function calculateWithdrawalUsage(
  withdrawals: Array<{ amount: number; currency: string }>,
  amount: number,
  currency: string,
  exchangeRate: number,
  limitUsd: number,
  limitCdf: number,
) {
  const spentUsd = withdrawals.reduce((sum, item) => sum + (normalizeCurrency(item.currency) === 'USD'
    ? roundCurrencyAmount(item.amount) : convertCurrencyAmount(item.amount, 'CDF', 'USD', exchangeRate)), 0)
  const spentCdf = withdrawals.reduce((sum, item) => sum + (normalizeCurrency(item.currency) === 'CDF'
    ? roundCurrencyAmount(item.amount) : convertCurrencyAmount(item.amount, 'USD', 'CDF', exchangeRate)), 0)
  const requestedUsd = normalizeCurrency(currency) === 'USD'
    ? roundCurrencyAmount(amount) : convertCurrencyAmount(amount, 'CDF', 'USD', exchangeRate)
  const requestedCdf = normalizeCurrency(currency) === 'CDF'
    ? roundCurrencyAmount(amount) : convertCurrencyAmount(amount, 'USD', 'CDF', exchangeRate)
  const totalUsd = roundCurrencyAmount(spentUsd + requestedUsd)
  const totalCdf = roundCurrencyAmount(spentCdf + requestedCdf)
  return {
    allowed: totalUsd <= limitUsd && totalCdf <= limitCdf,
    usedUsd: roundCurrencyAmount(spentUsd),
    usedCdf: roundCurrencyAmount(spentCdf),
    remainingUsd: roundCurrencyAmount(Math.max(0, limitUsd - spentUsd)),
    remainingCdf: roundCurrencyAmount(Math.max(0, limitCdf - spentCdf)),
    requestedUsd,
    requestedCdf,
  }
}
