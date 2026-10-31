export const DEFAULT_USD_CDF_RATE = 2300
export const EXCHANGE_RATE_CONFIG_KEY = 'exchange_rate_usd_cdf'

export type Currency = 'USD' | 'CDF'

export function normalizeCurrency(value: string | null | undefined): Currency {
  return value === 'CDF' || value === 'FC' ? 'CDF' : 'USD'
}

function decimalToMinor(value: number | string): bigint {
  const input = String(value).trim().replace(',', '.')
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(input)
  if (!match) throw new Error('Montant invalide')
  const sign = match[1] === '-' ? BigInt(-1) : BigInt(1)
  const whole = BigInt(match[2])
  const fraction = (match[3] ?? '').padEnd(3, '0')
  const hundredths = BigInt(fraction.slice(0, 2) || '0')
  const roundUp = Number(fraction[2] ?? '0') >= 5
  return sign * (whole * BigInt(100) + hundredths + (roundUp ? BigInt(1) : BigInt(0)))
}

function minorToAmount(minor: bigint): number {
  return Number(minor) / 100
}

function divideAndRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= BigInt(0)) throw new Error('Diviseur invalide')
  const sign = numerator < BigInt(0) ? BigInt(-1) : BigInt(1)
  const absolute = numerator < BigInt(0) ? -numerator : numerator
  const quotient = absolute / denominator
  const remainder = absolute % denominator
  return sign * (remainder * BigInt(2) >= denominator ? quotient + BigInt(1) : quotient)
}

export function roundCurrencyAmount(amount: number | string): number {
  return minorToAmount(decimalToMinor(amount))
}

export function calculateTransferFee(amount: number | string): number {
  // Default TRAIT outgoing transfer fee: 1%, rounded to cents.
  return calculatePercentageFee(amount, 100)
}

export function calculatePercentageFee(amount: number | string, basisPoints: number): number {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new Error('Pourcentage invalide')
  }
  const amountMinor = decimalToMinor(amount)
  return minorToAmount(divideAndRoundHalfUp(amountMinor * BigInt(basisPoints), BigInt(10_000)))
}

/** Calculate a fee with financial rounding for the selected currency. USD is
 * rounded to cents; CDF fees are rounded to whole francs. */
export function calculateCurrencyFee(amount: number | string, basisPoints: number, currency: Currency): number {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new Error('Pourcentage invalide')
  }
  const amountMinor = decimalToMinor(amount)
  const feeMinor = divideAndRoundHalfUp(amountMinor * BigInt(basisPoints), BigInt(10_000))
  return currency === 'CDF'
    ? minorToAmount(divideAndRoundHalfUp(feeMinor, BigInt(100)) * BigInt(100))
    : minorToAmount(feeMinor)
}

export function convertCurrencyAmount(
  amount: number | string,
  from: Currency,
  to: Currency,
  usdToCdfRate = DEFAULT_USD_CDF_RATE,
): number {
  const minor = decimalToMinor(amount)
  if (from === to) return minorToAmount(minor)
  if (!Number.isFinite(usdToCdfRate) || usdToCdfRate <= 0) throw new Error('Taux de change invalide')
  const rateMinor = decimalToMinor(usdToCdfRate)
  if (rateMinor <= BigInt(0)) throw new Error('Taux de change invalide')
  if (from === 'USD' && to === 'CDF') {
    // A USD-cent multiplied by a CDF/USD rate gives a CDF-cent after scaling
    // the rate to hundredths; divide that product back by 100.
    return minorToAmount(divideAndRoundHalfUp(minor * rateMinor, BigInt(100)))
  }
  // Convert CDF minor units to USD minor units using the rate in minor units.
  return minorToAmount(divideAndRoundHalfUp(minor * BigInt(100), rateMinor))
}

export function formatCurrencyAmount(amount: number, currencyInput: string, locale = 'fr-FR'): string {
  const currency = normalizeCurrency(currencyInput)
  const safeAmount = Number.isFinite(amount) ? amount : 0
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount) + ` ${currency}`
}

export function formatExchangeRate(rate: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(rate)
}
