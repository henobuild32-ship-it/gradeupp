import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getUsdCdfExchangeRate, setUsdCdfExchangeRate } from '@/lib/currency-server'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { rate } = body as { rate: number }

    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0 || rate > 1_000_000) {
      return NextResponse.json(
        { success: false, message: 'Taux invalide (doit être supérieur à zéro et inférieur ou égal à 1 000 000)' },
        { status: 400 }
      )
    }

    await setUsdCdfExchangeRate(rate)

    return NextResponse.json({ success: true, message: 'Taux USD/CDF mis à jour', rate, baseCurrency: 'USD', quoteCurrency: 'CDF' })
  } catch (error) {
    console.error('Update exchange rate error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ success: true, rate: await getUsdCdfExchangeRate(), baseCurrency: 'USD', quoteCurrency: 'CDF' })
}
