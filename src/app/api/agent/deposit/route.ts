import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkChildBalanceLimit, logSecurityEvent } from '@/lib/security'
import { requireUser } from '@/lib/auth'
import { updateBalanceAndNotify } from '@/lib/notifications'

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

    if (!clientPhone || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants ou invalides' },
        { status: 400 }
      )
    }

    const agent = await db.user.findUnique({
      where: { id: agentId },
    })

    if (!agent || agent.role !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Agent non trouvé' },
        { status: 404 }
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

    const limitCheck = await checkChildBalanceLimit(client.id, amount, currency || 'USD')
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

    const isFC = (currency || 'USD') === 'FC';

    // Atomic: create deposit, update client balance, create notifications for both parties
    await db.$transaction([
      db.deposit.create({
        data: {
          userId: client.id,
          amount,
          currency: currency || 'USD',
          method: 'agent',
          status: 'completed',
          agentId: agent.id,
        },
      }),
      db.user.update({
        where: { id: client.id },
        data: isFC
          ? { realBalanceFC: { increment: amount } }
          : { realBalance: { increment: amount } },
      }),
      db.notification.create({
        data: {
          userId: client.id,
          title: 'Dépôt reçu',
          message: `Un dépôt de ${isFC ? amount.toLocaleString('fr-FR') : '$' + amount.toFixed(2)} ${currency || 'USD'} a été effectué par l'agent ${agent.name || agent.pseudo || agent.agentCode || 'N/A'} via ${agent.phone}.`,
          type: 'general',
        },
      }),
      db.notification.create({
        data: {
          userId: agentId,
          title: 'Dépôt effectué',
          message: `Dépôt de ${isFC ? amount.toLocaleString('fr-FR') : '$' + amount.toFixed(2)} ${currency || 'USD'} effectué pour le client ${client.phone}.`,
          type: 'general',
        },
      }),
    ]);

    // Real-time balance update via WebSocket for both agent and client
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

    // Push notifications for both parties
    const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
    if (sendPushToUser) {
      const amountStr = isFC ? amount.toLocaleString('fr-FR') : '$' + amount.toFixed(2)
      sendPushToUser(client.id, {
        title: 'Dépôt reçu',
        body: `Dépôt de ${amountStr} ${currency || 'USD'} reçu via l'agent ${agent.name || agent.pseudo || 'N/A'}.`,
      }).catch(() => {})
      sendPushToUser(agentId, {
        title: 'Dépôt effectué',
        body: `Dépôt de ${amountStr} ${currency || 'USD'} effectué pour le client ${client.name || client.pseudo || client.phone}.`,
      }).catch(() => {})
    }

    await logSecurityEvent({
      userId: agent.id,
      action: 'agent_deposit',
      details: `L'agent ${agent.name || agent.pseudo || 'N/A'} (${agent.agentCode || agent.agentNumber || 'N/A'}) a effectué un dépôt de ${amount} ${currency || 'USD'} pour le client ${client.phone} (ID: ${client.id})`,
      riskLevel: 'low',
    })

    return NextResponse.json({
      success: true,
      deposit: {
        id: 'created',
        amount,
        currency: currency || 'USD',
        status: 'completed',
        createdAt: new Date().toISOString(),
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
