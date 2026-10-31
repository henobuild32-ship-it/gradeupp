import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getFinancialPolicy, setFinancialPolicy } from '@/lib/financial-policy'
import { getUsdCdfExchangeRate } from '@/lib/currency-server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth
  const [policy, exchangeRate] = await Promise.all([getFinancialPolicy(), getUsdCdfExchangeRate()])
  return NextResponse.json({ success: true, policy, exchangeRate })
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth
    const body = await request.json().catch(() => null)
    const policy = body?.policy
    if (!policy || typeof policy !== 'object') {
      return NextResponse.json({ success: false, message: 'Configuration financière invalide.' }, { status: 400 })
    }
    if (Number(policy.withdrawalFeeBasisPoints) !== 100 || Number(policy.internationalSendFeeBasisPoints) !== 100) {
      return NextResponse.json({ success: false, message: 'Les frais d’envoi et de retrait TRAIT sont fixés à 1 %.' }, { status: 400 })
    }
    const rate = await getUsdCdfExchangeRate()
    const coherentCdfLimit = Number(policy.dailyWithdrawalLimitUsd) * rate
    if (Math.abs(Number(policy.dailyWithdrawalLimitCdf) - coherentCdfLimit) > 0.01) {
      return NextResponse.json({ success: false, message: `Le plafond CDF doit correspondre au plafond USD au taux actuel (${rate}).` }, { status: 400 })
    }
    const saved = await setFinancialPolicy(policy)
    await db.adminActivityLog.create({
      data: { adminId: auth.userId, action: 'update_financial_policy', details: JSON.stringify(saved) },
    })
    return NextResponse.json({ success: true, policy: saved, exchangeRate: rate })
  } catch (error) {
    console.error('Update financial policy failed:', error)
    return NextResponse.json({ success: false, message: 'Impossible d’enregistrer la configuration financière.' }, { status: 500 })
  }
}
