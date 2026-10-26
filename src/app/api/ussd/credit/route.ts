import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, verifyPinWithAttempts } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { updateBalanceAndNotify } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `ussd-credit:${auth.userId}:${ip}` })
    if (!limit.allowed) return rateLimitResponse(limit.resetIn)

    const body = await request.json()
    const { userId, network, phoneNumber, amount, currency, pin } = body
    if (userId !== auth.userId || !['Vodacom', 'Airtel', 'Orange', 'Africell'].includes(network) ||
        typeof phoneNumber !== 'string' || !/^\+?[0-9\s-]{8,20}$/.test(phoneNumber) ||
        typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !['USD', 'FC'].includes(currency) ||
        typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ success: false, message: 'Réseau, numéro, montant, devise ou PIN invalide.' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: auth.userId }, select: { id: true, realBalance: true, realBalanceFC: true, tempBlocked: true, suspended: true } })
    if (!user) return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 })
    if (user.tempBlocked || user.suspended) return NextResponse.json({ success: false, message: 'Votre compte est suspendu ou temporairement bloqué.' }, { status: 403 })

    const pinResult = await verifyPinWithAttempts(user.id, pin)
    if (!pinResult.valid) return NextResponse.json({ success: false, message: pinResult.blocked ? 'Trop de tentatives. Compte bloqué temporairement.' : 'PIN incorrect.' }, { status: pinResult.blocked ? 429 : 401 })

    const cur = currency as 'USD' | 'FC'
    const balanceField = cur === 'FC' ? 'realBalanceFC' : 'realBalance'
    let creditPurchase
    try {
      creditPurchase = await db.$transaction(async (tx) => {
        const debit = await tx.user.updateMany({
          where: { id: user.id, [balanceField]: { gte: amount }, tempBlocked: false, suspended: false },
          data: { [balanceField]: { decrement: amount } },
        })
        if (debit.count !== 1) throw new Error('INSUFFICIENT_BALANCE')
        const purchase = await tx.creditPurchase.create({
          data: { userId: user.id, network, phoneNumber: phoneNumber.trim(), amount, currency: cur, status: 'completed' },
        })
        await tx.transaction.create({
          data: { type: 'credit_purchase', amount, fee: 0, currency: cur, status: 'completed', senderId: user.id, receiverId: user.id, description: `Achat de crédit ${network} pour ${phoneNumber.trim()}` },
        })
        await tx.notification.create({
          data: { userId: user.id, title: 'Achat de crédit', message: `Achat de ${amount.toFixed(2)} ${cur} de crédit ${network} pour ${phoneNumber.trim()}`, type: 'purchase' },
        })
        return purchase
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') return NextResponse.json({ success: false, message: `Solde ${cur} insuffisant.` }, { status: 400 })
      throw error
    }

    const balance = await db.user.findUnique({ where: { id: user.id }, select: { realBalance: true, realBalanceFC: true } })
    updateBalanceAndNotify(user.id, balance?.realBalance, balance?.realBalanceFC).catch(() => {})
    return NextResponse.json({ success: true, creditPurchase: { id: creditPurchase.id, network: creditPurchase.network, phoneNumber: creditPurchase.phoneNumber, amount: creditPurchase.amount, currency: creditPurchase.currency, status: creditPurchase.status } })
  } catch (error) {
    console.error('USSD credit purchase error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
