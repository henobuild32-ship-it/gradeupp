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
    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `ussd-bill:${auth.userId}:${ip}` })
    if (!limit.allowed) return rateLimitResponse(limit.resetIn)

    const body = await request.json()
    const { userId, billType, reference, amount, currency, pin } = body
    const validTypes = ['electricity', 'water', 'internet', 'subscription', 'other']
    if (userId !== auth.userId || !validTypes.includes(billType) || typeof reference !== 'string' || reference.trim().length < 2 || reference.length > 100 ||
        typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !['USD', 'FC'].includes(currency) ||
        typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ success: false, message: 'Type, référence, montant, devise ou PIN invalide.' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: auth.userId, }, select: { id: true, tempBlocked: true, suspended: true } })
    if (!user) return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 })
    if (user.tempBlocked || user.suspended) return NextResponse.json({ success: false, message: 'Votre compte est suspendu ou temporairement bloqué.' }, { status: 403 })

    const pinResult = await verifyPinWithAttempts(user.id, pin)
    if (!pinResult.valid) return NextResponse.json({ success: false, message: pinResult.blocked ? 'Trop de tentatives. Compte bloqué temporairement.' : 'PIN incorrect.' }, { status: pinResult.blocked ? 429 : 401 })

    const cur = currency as 'USD' | 'FC'
    const balanceField = cur === 'FC' ? 'realBalanceFC' : 'realBalance'
    const typeLabels: Record<string, string> = { electricity: 'Électricité', water: 'Eau', internet: 'Internet', subscription: 'Abonnement', other: 'Autre' }
    let billPayment
    try {
      billPayment = await db.$transaction(async (tx) => {
        const debit = await tx.user.updateMany({
          where: { id: user.id, [balanceField]: { gte: amount }, tempBlocked: false, suspended: false },
          data: { [balanceField]: { decrement: amount } },
        })
        if (debit.count !== 1) throw new Error('INSUFFICIENT_BALANCE')
        const payment = await tx.billPayment.create({
          data: { userId: user.id, billType, reference: reference.trim(), amount, currency: cur, status: 'completed' },
        })
        await tx.transaction.create({
          data: { type: 'bill_payment', amount, fee: 0, currency: cur, status: 'completed', senderId: user.id, receiverId: user.id, description: `Paiement ${typeLabels[billType]} (réf. ${reference.trim()})` },
        })
        await tx.notification.create({
          data: { userId: user.id, title: 'Paiement de facture', message: `Paiement de ${amount.toFixed(2)} ${cur} pour ${typeLabels[billType]} (réf. ${reference.trim()})`, type: 'purchase' },
        })
        return payment
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') return NextResponse.json({ success: false, message: `Solde ${cur} insuffisant.` }, { status: 400 })
      throw error
    }

    const balance = await db.user.findUnique({ where: { id: user.id }, select: { realBalance: true, realBalanceFC: true } })
    updateBalanceAndNotify(user.id, balance?.realBalance, balance?.realBalanceFC).catch(() => {})
    return NextResponse.json({ success: true, billPayment: { id: billPayment.id, billType: billPayment.billType, reference: billPayment.reference, amount: billPayment.amount, currency: billPayment.currency, status: billPayment.status } })
  } catch (error) {
    console.error('USSD bill payment error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
