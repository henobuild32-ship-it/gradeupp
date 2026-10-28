import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkChildBalanceLimit } from '@/lib/security'
import { requireUser } from '@/lib/auth'
import { findActiveAgentByIdentifier } from '@/lib/agents'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { depositMethodLabel, formatAmount } from '@/lib/tx-labels'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 5, key: `deposit-request:${auth.userId}:${ip}` })
    if (!limit.allowed) return rateLimitResponse(limit.resetIn)

    const body = await request.json().catch(() => ({}))
    const { amount, currency, method, agentCode, agentNumber } = body as {
      amount?: number
      currency?: string
      method?: string
      agentCode?: string
      agentNumber?: string
    }

    if (method !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Les dépôts par prestataire externe ne sont pas activés. Utilisez un agent Trait.' },
        { status: 410, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 ||
        (currency !== 'USD' && currency !== 'CDF')) {
      return NextResponse.json({ success: false, message: 'Montant positif requis et devise USD ou CDF.' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, pseudo: true, phone: true, tempBlocked: true, suspended: true },
    })
    if (!user) return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 })
    if (user.tempBlocked || user.suspended) {
      return NextResponse.json({ success: false, message: 'Votre compte est suspendu ou temporairement bloqué.' }, { status: 403 })
    }

    const code = (agentCode || agentNumber || '').trim()
    if (!code) return NextResponse.json({ success: false, message: 'Code agent requis.' }, { status: 400 })

    const agent = await findActiveAgentByIdentifier(code)
    if (!agent) {
      return NextResponse.json({ success: false, message: 'Agent introuvable, non validé ou suspendu. Vérifiez son code.' }, { status: 404 })
    }
    if (agent.id === user.id) {
      return NextResponse.json({ success: false, message: 'Vous ne pouvez pas déposer auprès de votre propre compte agent.' }, { status: 400 })
    }

    const storedCurrency = currency === 'CDF' ? 'FC' : 'USD'
    const limitCheck = await checkChildBalanceLimit(user.id, amount, storedCurrency)
    if (!limitCheck.allowed) return NextResponse.json({ success: false, message: limitCheck.message }, { status: 400 })

    const amountLabel = formatAmount(amount, currency)
    const clientLabel = user.name || user.pseudo || user.phone
    const agentName = agent.agentCode || agent.agentNumber || ''
    const description = `${depositMethodLabel('agent')} de ${amountLabel} pour ${clientLabel} — en attente de validation`

    const deposit = await db.$transaction(async (tx) => {
      const created = await tx.deposit.create({
        data: { userId: user.id, amount, currency: storedCurrency, method: 'agent', status: 'pending', agentId: agent.id },
      })
      await tx.transaction.create({
        data: {
          type: 'deposit', amount, fee: 0, currency: storedCurrency, status: 'pending',
          senderId: user.id, receiverId: agent.id, agentId: agent.id, description,
        },
      })
      await tx.notification.createMany({
        data: [
          { userId: agent.id, title: 'Nouveau dépôt à valider', message: `${clientLabel} demande un dépôt de ${amountLabel}. Vérifiez la réception avant de valider.`, type: 'general' },
          { userId: user.id, title: 'Dépôt en attente', message: `Votre demande de dépôt via l’agent ${agentName} attend sa validation. Le solde n’est pas encore crédité.`, type: 'general' },
        ],
      })
      return created
    })

    try {
      const { sendPushToUser } = await import('@/lib/push')
      await sendPushToUser(agent.id, {
        title: 'Nouveau dépôt à valider',
        body: `${clientLabel} demande ${amountLabel}. Vérifiez le dépôt dans l’application.`,
        url: '/agent-withdraw-validate',
      })
    } catch {}

    return NextResponse.json({
      success: true,
      pending: true,
      message: `Demande envoyée à l’agent ${agentName}. Le solde sera crédité après validation.`,
      deposit: { id: deposit.id, amount, currency, status: 'pending', agentCode: agentName, createdAt: deposit.createdAt },
    }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Agent deposit request error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
