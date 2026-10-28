import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, verifyPinWithAttempts } from '@/lib/auth'
import { findAgentByIdentifier, findActiveAgentByIdentifier } from '@/lib/agents'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { updateBalanceAndNotify } from '@/lib/notifications'
import { calculatePercentageFee, normalizeCurrency, roundCurrencyAmount } from '@/lib/currency'

const requestIdPattern = /^[A-Za-z0-9_-]{16,64}$/

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => ({}))
    const { userId, agentCode, amount: rawAmount, currency: rawCurrency, pin, clientRequestId } = body as {
      userId?: string
      agentCode?: string
      amount?: number
      currency?: string
      pin?: string
      clientRequestId?: string
    }
    if (
      userId !== auth.userId || typeof agentCode !== 'string' || !agentCode.trim() ||
      typeof rawAmount !== 'number' || !Number.isFinite(rawAmount) || rawAmount <= 0 || rawAmount > 10_000_000 ||
      !['USD', 'CDF', 'FC'].includes(rawCurrency || '') || typeof pin !== 'string' || !/^\d{4,8}$/.test(pin) ||
      typeof clientRequestId !== 'string' || !requestIdPattern.test(clientRequestId)
    ) {
      return NextResponse.json({ success: false, message: 'Agent, montant, devise, référence et PIN valides requis.' }, { status: 400 })
    }

    const amount = roundCurrencyAmount(rawAmount)
    if (amount <= 0) return NextResponse.json({ success: false, message: 'Le montant doit être d’au moins 0,01.' }, { status: 400 })
    const currency = normalizeCurrency(rawCurrency)
    const normalizedAgentCode = agentCode.trim().toUpperCase()
    const requestFingerprint = createHash('sha256').update(JSON.stringify({
      amount: amount.toFixed(2),
      currency,
      method: 'ussd_agent',
      agentCode: normalizedAgentCode,
    })).digest('hex')

    const user = await db.user.findUnique({ where: { id: auth.userId } })
    if (!user) return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 })
    if (user.tempBlocked || user.suspended) return NextResponse.json({ success: false, message: 'Votre compte est suspendu ou temporairement bloqué.' }, { status: 403 })

    const pinResult = await verifyPinWithAttempts(user.id, pin)
    if (!pinResult.valid) return NextResponse.json({ success: false, message: pinResult.blocked ? 'Trop de tentatives. Compte bloqué temporairement.' : 'PIN incorrect.' }, { status: pinResult.blocked ? 429 : 401 })

    const withdrawalsDb = db.withdrawal as any
    const findExisting = () => withdrawalsDb.findUnique({
      where: { userId_clientRequestId: { userId: auth.userId, clientRequestId } },
    })
    const responseForExisting = async (existing: any) => {
      if (existing.requestFingerprint !== requestFingerprint) {
        return NextResponse.json({ success: false, code: 'IDEMPOTENCY_KEY_REUSED', message: 'Cette référence correspond déjà à une autre opération.' }, { status: 409 })
      }
      const balances = await db.user.findUnique({ where: { id: auth.userId }, select: { realBalance: true, realBalanceFC: true } })
      return NextResponse.json({
        success: true,
        duplicate: true,
        withdrawal: { id: existing.id, amount: existing.amount, fee: existing.fee, currency: existing.currency, status: existing.status, agentCode: existing.agentId },
        updatedBalances: balances,
      })
    }

    const existing = await findExisting()
    if (existing) return responseForExisting(existing)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `ussd-withdraw:${auth.userId}:${ip}` })
    if (!limit.allowed) return rateLimitResponse(limit.resetIn)

    const agent = await findActiveAgentByIdentifier(agentCode.trim())
    if (!agent) {
      const found = await findAgentByIdentifier(agentCode.trim())
      if (found?.suspended) return NextResponse.json({ success: false, message: 'Cet agent est suspendu.' }, { status: 403 })
      if (found && found.validationStatus !== 'validated') return NextResponse.json({ success: false, message: "Cet agent n'est pas encore validé." }, { status: 403 })
      return NextResponse.json({ success: false, message: 'Agent non trouvé ou non actif.' }, { status: 404 })
    }
    if (agent.id === user.id) return NextResponse.json({ success: false, message: 'Vous ne pouvez pas effectuer un retrait de votre propre compte agent.' }, { status: 400 })

    const fee = calculatePercentageFee(amount, 100)
    const balanceField = currency === 'CDF' ? 'realBalanceFC' : 'realBalance'
    const amountLabel = `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
    let result
    try {
      result = await db.$transaction(async (tx) => {
        const debit = await tx.user.updateMany({
          where: { id: user.id, [balanceField]: { gte: amount + fee }, tempBlocked: false, suspended: false },
          data: { [balanceField]: { decrement: amount + fee } },
        })
        if (debit.count !== 1) throw new Error('INSUFFICIENT_BALANCE')

        const withdrawal = await (tx.withdrawal as any).create({
          data: {
            userId: user.id,
            amount,
            fee,
            feeFromBonus: false,
            currency,
            method: 'ussd_agent',
            status: 'pending',
            agentId: agent.id,
            clientRequestId,
            requestFingerprint,
          },
        })
        const transaction = await tx.transaction.create({
          data: {
            type: 'withdrawal',
            amount,
            fee,
            currency,
            status: 'pending',
            senderId: user.id,
            receiverId: agent.id,
            agentId: agent.id,
            description: `Retrait de ${amountLabel} via agent ${agent.agentCode || agent.agentNumber || agent.name || 'Trait Fintech'}`,
            clientRequestId,
            requestFingerprint,
          },
        })
        await tx.notification.createMany({
          data: [
            { userId: user.id, title: 'Retrait en cours de validation', message: `Votre demande de retrait de ${amountLabel} (frais : ${fee.toFixed(2)} ${currency}) attend la validation de l’agent.`, type: 'withdrawal_validated' },
            { userId: agent.id, title: 'Nouvelle demande de retrait', message: `Le client ${user.phone} demande un retrait de ${amountLabel}.`, type: 'general' },
          ],
        })
        return { withdrawal, transaction }
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') return NextResponse.json({ success: false, message: `Solde ${currency} insuffisant pour couvrir le montant et les frais.` }, { status: 400 })
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        const raced = await findExisting()
        if (raced) return responseForExisting(raced)
      }
      throw error
    }

    const updatedUser = await db.user.findUnique({ where: { id: user.id }, select: { realBalance: true, realBalanceFC: true } })
    updateBalanceAndNotify(user.id, updatedUser?.realBalance, updatedUser?.realBalanceFC).catch(() => {})
    const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
    if (sendPushToUser) {
      sendPushToUser(user.id, { title: 'Retrait en attente', body: `Demande de retrait de ${amountLabel} envoyée à ${agent.businessName || agent.name || 'Trait Fintech'}.`, url: '/history' }).catch(() => {})
      sendPushToUser(agent.id, { title: 'Nouvelle demande de retrait (USSD)', body: `Le client ${user.phone} souhaite retirer ${amountLabel}.`, url: '/agent-pending' }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      withdrawal: { id: result.withdrawal.id, amount: result.withdrawal.amount, fee: result.withdrawal.fee, currency: result.withdrawal.currency, status: result.withdrawal.status, agentCode: agent.agentCode },
      transaction: { id: result.transaction.id, status: result.transaction.status },
      updatedBalances: updatedUser,
    })
  } catch (error) {
    console.error('USSD withdraw error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
