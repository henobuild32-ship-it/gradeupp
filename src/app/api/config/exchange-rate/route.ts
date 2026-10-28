import { NextResponse } from 'next/server'
import { getUsdCdfExchangeRate } from '@/lib/currency-server'
import { DEFAULT_USD_CDF_RATE } from '@/lib/currency'

export async function GET() {
  try {
    const rate = await getUsdCdfExchangeRate()
    return NextResponse.json({ success: true, rate, baseCurrency: 'USD', quoteCurrency: 'CDF', currencies: ['USD', 'CDF'] }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.error('Exchange rate error:', error)
    return NextResponse.json({ success: true, rate: DEFAULT_USD_CDF_RATE, baseCurrency: 'USD', quoteCurrency: 'CDF', currencies: ['USD', 'CDF'] }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  }
}
