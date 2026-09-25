import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkChildBalanceLimit, logSecurityEvent } from '@/lib/security'
import { requireUser } from '@/lib/auth'
import { updateBalanceAndNotify } from '@/lib/notifications'
import { formatAmount } from '@/lib/tx-labels'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { clientPhone, amount, currency } = body as {
      clientPhone: string
      amount: number
      currency: string
    }

    const agentId = auth.userId

    if (!clientPhone || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants ou invalides' },
        { status: 400 }
      )
    }

    const cur = currency === 'FC' ? 'FC' : 'USD'

    const agent = await db.user.findUnique({
      where: { id: agentId },
    })

    if (!agent || agent.role !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Agent non trouvé' },
        { status: 404 }
      )
    }

    if (agent.validationStatus !== 'validated') {
      return NextResponse.json(
        { success: false, message: 'Votre compte agent n\'est pas encore validé' },
        { status: 403 }
      )
    }

    if (agent.suspended) {
      return NextResponse.json(
        { success: false, message: 'Votre compte agent est suspendu' },
        { status: 403 }
      )
    }

    if (agent.tempBlocked) {
      return NextResponse.json(
        { success: false, message: 'Votre compte agent est temporairement bloqué' },
        { status: 403 }
      )
    }

    const client = await db.user.findUnique({
      where: { phone: clientPhone.trim() },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, message: 'Client non trouvé' },
        { status: 404 }
      )
    }

    if (client.suspended || client.tempBlocked) {
      return NextResponse.json(
        { success: false, message: 'Ce compte client est suspendu ou bloqué' },
        { status: 403 }
      )
    }

    const limitCheck = await checkChildBalanceLimit(client.id, amount, cur)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, message: limitCheck.message },
        { status: 400 }
      )
    }

    if (client.id === agentId) {
      return NextResponse.json(
        { success: false, message: 'Vous ne pouvez pas effectuer un dépôt pour vous-même' },
        { status: 400 }
      )
    }

    const isFC = cur === 'FC'
    const amountLabel = formatAmount(amount, cur)
    const agentLabel = agent.agentCode || agent.agentNumber || agent.name || agent.pseudo || 'agent'
    const clientLabel = client.name || client.pseudo || client.phone
    const description = `Dépôt de ${amountLabel} via agent ${agentLabel} pour ${clientLabel}`

    const deposit = await db.$transaction(async (tx) => {
      // Vraie logique cash : l'agent reçoit le liquide du client → son compte est crédité
      await tx.user.update({
        where: { id: agent.id },
        data: isFC
          ? { realBalanceFC: { increment: amount } }
          : { realBalance: { increment: amount } },
      })

      const created = await tx.deposit.create({
        data: {
          userId: client.id,
          amount,
          currency: cur,
          method: 'agent',
          status: 'completed',
          agentId: agent.id,
        },
      })

      await tx.user.update({
        where: { id: client.id },
        data: isFC
          ? { realBalanceFC: { increment: amount } }
          : { realBalance: { increment: amount } },
      })

      await tx.transaction.create({
        data: {
          type: 'deposit',
          amount,
          fee: 0,
          currency: cur,
          status: 'completed',
          senderId: agent.id,
          receiverId: client.id,
          agentId: agent.id,
          description,
        },
      })

      await tx.notification.create({
        data: {
          userId: client.id,
          title: 'Dépôt reçu',
          message: `Un dépôt de ${amountLabel} a été effectué par l'agent ${agentLabel}.`,
          type: 'general',
        },
      })

      await tx.notification.create({
        data: {
          userId: agentId,
          title: 'Dépôt effectué',
          message: `Dépôt de ${amountLabel} effectué pour le client ${client.phone}.`,
          type: 'general',
        },
      })

      return created
    })

    const updatedClient = await db.user.findUnique({
      where: { id: client.id },
      select: { realBalance: true, realBalanceFC: true },
    })
    updateBalanceAndNotify(client.id, updatedClient?.realBalance, updatedClient?.realBalanceFC).catch(() => {})

    const updatedAgent = await db.user.findUnique({
      where: { id: agentId },
      select: { realBalance: true, realBalanceFC: true },
    })
    updateBalanceAndNotify(agentId, updatedAgent?.realBalance, updatedAgent?.realBalanceFC).catch(() => {})

    const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
    if (sendPushToUser) {
      sendPushToUser(client.id, {
        title: 'Dépôt reçu',
        body: `Dépôt de ${amountLabel} reçu via l'agent ${agent.name || agent.pseudo || 'TRAIT'}.`,
      }).catch(() => {})
      sendPushToUser(agentId, {
        title: 'Dépôt effectué',
        body: `Dépôt de ${amountLabel} effectué pour le client ${clientLabel}.`,
      }).catch(() => {})
    }

    await logSecurityEvent({
      userId: agent.id,
      action: 'agent_deposit',
      details: description,
      riskLevel: 'low',
    })

    return NextResponse.json({
      success: true,
      deposit: {
        id: deposit.id,
        amount,
        currency: cur,
        status: 'completed',
        description,
        createdAt: deposit.createdAt,
      },
    })
  } catch (error) {
    console.error('Agent deposit error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
