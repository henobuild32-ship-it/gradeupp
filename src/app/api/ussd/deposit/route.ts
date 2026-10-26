import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { findActiveAgentByIdentifier } from '@/lib/agents'
import { checkChildBalanceLimit } from '@/lib/security'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 5, key: `ussd-deposit-request:${auth.userId}:${ip}` })
    if (!limit.allowed) return rateLimitResponse(limit.resetIn)

    const body = await request.json()
    const { userId, agentCode, amount, currency } = body
    if ((userId && userId !== auth.userId) || typeof agentCode !== 'string' || !agentCode.trim() ||
        typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !['USD', 'FC'].includes(currency)) {
      return NextResponse.json({ success: false, message: 'Agent, montant ou devise invalide.' }, { status: 400 })
    }

    const [user, agent] = await Promise.all([
      db.user.findUnique({ where: { id: auth.userId }, select: { id: true, suspended: true, tempBlocked: true } }),
      findActiveAgentByIdentifier(agentCode.trim()),
    ])
    if (!user) return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 })
    if (user.suspended || user.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Votre compte est suspendu ou temporairement bloqué.' }, { status: 403 })
    }
    if (!agent) return NextResponse.json({ success: false, message: 'Agent non trouvé ou non actif.' }, { status: 404 })
    if (agent.id === user.id) return NextResponse.json({ success: false, message: 'Vous ne pouvez pas demander un dépôt auprès de votre propre compte.' }, { status: 400 })

    const cur = currency as 'USD' | 'FC'
    const limitCheck = await checkChildBalanceLimit(user.id, amount, cur)
    if (!limitCheck.allowed) return NextResponse.json({ success: false, message: limitCheck.message }, { status: 400 })

    const deposit = await db.$transaction(async (tx) => {
      const created = await tx.deposit.create({
        data: { userId: user.id, amount, currency: cur, method: 'ussd_agent', status: 'pending', agentId: agent.id },
      })
      await tx.notification.createMany({
        data: [
          { userId: user.id, title: 'Demande de dépôt envoyée', message: `Votre demande de dépôt de ${amount.toFixed(2)} ${cur} a été envoyée à l’agent ${agent.agentCode || agent.name || 'TRAIT'}. Votre solde sera crédité après validation par l’agent.`, type: 'general' },
          { userId: agent.id, title: 'Nouvelle demande de dépôt', message: `Un client demande un dépôt de ${amount.toFixed(2)} ${cur}. Vérifiez la réception des espèces avant de valider.`, type: 'general' },
        ],
      })
      return created
    })

    return NextResponse.json({
      success: true,
      message: 'Demande envoyée. Le solde ne sera crédité qu’après validation par l’agent.',
      deposit: { id: deposit.id, amount: deposit.amount, currency: deposit.currency, status: deposit.status, agentCode: agent.agentCode },
    })
  } catch (error) {
    console.error('USSD deposit request error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
