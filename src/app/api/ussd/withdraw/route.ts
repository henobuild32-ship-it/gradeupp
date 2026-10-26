import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, verifyPinWithAttempts } from '@/lib/auth'
import { findAgentByIdentifier, findActiveAgentByIdentifier } from '@/lib/agents'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { updateBalanceAndNotify } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `ussd-withdraw:${auth.userId}:${ip}` })
    if (!limit.allowed) return rateLimitResponse(limit.resetIn)

    const body = await request.json()
    const { userId, agentCode, amount, currency, pin } = body
    if (userId !== auth.userId || typeof agentCode !== 'string' || !agentCode.trim() ||
        typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !['USD', 'FC'].includes(currency) ||
        typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ success: false, message: 'Agent, montant, devise ou PIN invalide.' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: auth.userId } })
    if (!user) return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 })
    if (user.tempBlocked || user.suspended) return NextResponse.json({ success: false, message: 'Votre compte est suspendu ou temporairement bloqué.' }, { status: 403 })

    const pinResult = await verifyPinWithAttempts(user.id, pin)
    if (!pinResult.valid) return NextResponse.json({ success: false, message: pinResult.blocked ? 'Trop de tentatives. Compte bloqué temporairement.' : 'PIN incorrect.' }, { status: pinResult.blocked ? 429 : 401 })

    const agent = await findActiveAgentByIdentifier(agentCode.trim())
    if (!agent) {
      const found = await findAgentByIdentifier(agentCode.trim())
      if (found?.suspended) return NextResponse.json({ success: false, message: 'Cet agent est suspendu.' }, { status: 403 })
      if (found && found.validationStatus !== 'validated') return NextResponse.json({ success: false, message: "Cet agent n'est pas encore validé." }, { status: 403 })
      return NextResponse.json({ success: false, message: 'Agent non trouvé ou non actif.' }, { status: 404 })
    }
    if (agent.id === user.id) return NextResponse.json({ success: false, message: 'Vous ne pouvez pas effectuer un retrait de votre propre compte agent.' }, { status: 400 })

    const cur = currency as 'USD' | 'FC'
    const isFC = cur === 'FC'
    const balanceField = isFC ? 'realBalanceFC' : 'realBalance'
    const fee = Math.round(amount * 0.01 * 100) / 100
    let withdrawal
    try {
      withdrawal = await db.$transaction(async (tx) => {
        const debit = await tx.user.updateMany({
          where: { id: user.id, [balanceField]: { gte: amount + fee }, tempBlocked: false, suspended: false },
          data: { [balanceField]: { decrement: amount + fee } },
        })
        if (debit.count !== 1) throw new Error('INSUFFICIENT_BALANCE')

        const created = await tx.withdrawal.create({
          data: { userId: user.id, amount, fee, currency: cur, method: 'ussd_agent', status: 'pending', agentId: agent.id },
        })
        await tx.transaction.create({
          data: { type: 'withdrawal', amount, fee, currency: cur, status: 'pending', senderId: user.id, receiverId: agent.id, agentId: agent.id, description: `Retrait de ${amount.toFixed(2)} ${cur} via agent ${agent.agentCode || agent.agentNumber || agent.name || 'TRAIT'}` },
        })
        await tx.notification.createMany({
          data: [
            { userId: user.id, title: 'Retrait en cours de validation', message: `Votre demande de retrait de ${amount.toFixed(2)} ${cur} (frais: ${fee.toFixed(2)} ${cur}) via l'agent ${agent.agentCode} est en attente de validation.`, type: 'withdrawal_validated' },
            { userId: agent.id, title: 'Nouvelle demande de retrait', message: `Le client ${user.phone} demande un retrait de ${amount.toFixed(2)} ${cur}.`, type: 'general' },
          ],
        })
        return created
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') return NextResponse.json({ success: false, message: `Solde ${cur} insuffisant.` }, { status: 400 })
      throw error
    }

    const updatedUser = await db.user.findUnique({ where: { id: user.id }, select: { realBalance: true, realBalanceFC: true } })
    updateBalanceAndNotify(user.id, updatedUser?.realBalance, updatedUser?.realBalanceFC).catch(() => {})
    const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
    if (sendPushToUser) {
      const amountLabel = isFC ? amount.toLocaleString('fr-FR') : `$${amount.toFixed(2)}`
      sendPushToUser(user.id, { title: 'Retrait en attente', body: `Demande de retrait de ${amountLabel} ${cur} envoyée à ${agent.businessName || agent.name || 'TRAIT'}.`, url: '/history' }).catch(() => {})
      sendPushToUser(agent.id, { title: 'Nouvelle demande de retrait (USSD)', body: `Le client ${user.phone} souhaite retirer ${amountLabel} ${cur}.`, url: '/agent-pending' }).catch(() => {})
    }

    return NextResponse.json({ success: true, withdrawal: { id: withdrawal.id, amount: withdrawal.amount, fee: withdrawal.fee, currency: withdrawal.currency, status: withdrawal.status, agentCode: agent.agentCode } })
  } catch (error) {
    console.error('USSD withdraw error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
