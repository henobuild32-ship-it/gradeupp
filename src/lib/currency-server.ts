import { db } from '@/lib/db'
import { DEFAULT_USD_CDF_RATE, EXCHANGE_RATE_CONFIG_KEY } from '@/lib/currency'

export async function getUsdCdfExchangeRate(): Promise<number> {
  try {
    const config = await db.systemConfig.findUnique({ where: { key: EXCHANGE_RATE_CONFIG_KEY } })
    const rate = config ? Number(config.value) : DEFAULT_USD_CDF_RATE
    return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_CDF_RATE
  } catch {
    return DEFAULT_USD_CDF_RATE
  }
}

export async function setUsdCdfExchangeRate(rate: number): Promise<void> {
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1_000_000) {
    throw new Error('Taux USD/CDF invalide')
  }
  await db.systemConfig.upsert({
    where: { key: EXCHANGE_RATE_CONFIG_KEY },
    update: { value: String(rate) },
    create: { key: EXCHANGE_RATE_CONFIG_KEY, value: String(rate) },
  })
}
