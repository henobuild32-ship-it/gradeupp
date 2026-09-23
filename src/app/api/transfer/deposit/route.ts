import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkChildBalanceLimit } from '@/lib/security'
import { requireUser } from '@/lib/auth'
import { updateBalanceAndNotify } from '@/lib/notifications'
import { findActiveAgentByIdentifier } from '@/lib/agents'
import { depositMethodLabel, formatAmount } from '@/lib/tx-labels'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { amount, currency, method, agentNumber, agentCode } = body as {
      amount: number
      currency: string
      method: string
      agentNumber?: string
      agentCode?: string
    }

    const userId = auth.userId

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Montant positif requis' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    if (user.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Votre compte est temporairement bloqué.' }, { status: 403 })
    }

    if (user.suspended) {
      return NextResponse.json({ success: false, message: 'Votre compte est suspendu.' }, { status: 403 })
    }

    const isFC = currency === 'FC'
    const cur = isFC ? 'FC' : (currency === 'USD' ? 'USD' : 'USD')
    const amountLabel = formatAmount(amount, cur)

    const limitCheck = await checkChildBalanceLimit(userId, amount, cur)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, message: limitCheck.message },
        { status: 400 }
      )
    }

    // Dépôt via agent : code agent obligatoire + agent actif + validation par l'agent
    if (method === 'agent') {
      const code = (agentCode || agentNumber || '').trim()
      if (!code) {
        return NextResponse.json(
          { success: false, message: 'Code agent requis pour un dépôt via agent' },
          { status: 400 }
        )
      }

      const agent = await findActiveAgentByIdentifier(code)
      if (!agent) {
        return NextResponse.json(
          {
            success: false,
            message: 'Agent introuvable, non validé ou suspendu. Vérifiez le code agent.',
          },
          { status: 404 }
        )
      }

      if (agent.id === userId) {
        return NextResponse.json(
          { success: false, message: 'Vous ne pouvez pas déposer via votre propre code agent' },
          { status: 400 }
        )
      }

      const clientLabel = user.name || user.pseudo || user.phone
      const description = `${depositMethodLabel('agent')} de ${amountLabel} pour ${clientLabel} — en attente de validation`

      await db.$transaction([
        db.deposit.create({
          data: {
            userId,
            amount,
            currency: cur,
            method: 'agent',
            status: 'pending',
            agentId: agent.id,
          },
        }),
        db.transaction.create({
          data: {
            type: 'deposit',
            amount,
            fee: 0,
            currency: cur,
            status: 'pending',
            senderId: userId,
            receiverId: agent.id,
            agentId: agent.id,
            description,
          },
        }),
        db.notification.create({
          data: {
            userId: agent.id,
            title: 'Nouveau dépôt à valider',
            message: `${clientLabel} demande un dépôt de ${amountLabel}. Validez pour créditer le compte. Code: ${agent.agentCode || agent.agentNumber || ''}`,
            type: 'general',
          },
        }),
        db.notification.create({
          data: {
            userId,
            title: 'Dépôt en attente',
            message: `Votre demande de dépôt de ${amountLabel} via l'agent ${agent.agentCode || agent.agentNumber || ''} est en attente de validation par l'agent.`,
            type: 'general',
          },
        }),
      ])

      const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
      if (sendPushToUser) {
        sendPushToUser(agent.id, {
          title: 'Nouveau dépôt à valider',
          body: `${clientLabel} demande ${amountLabel}. Validez dans l'app.`,
          url: '/agent-withdraw-validate',
        }).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        pending: true,
        message: `Demande envoyée à l'agent ${agent.agentCode || agent.agentNumber || ''}. Le solde sera crédité après validation.`,
        deposit: {
          amount,
          currency: cur,
          status: 'pending',
          agentCode: agent.agentCode || agent.agentNumber,
          createdAt: new Date().toISOString(),
        },
      })
    }

    // Autres méthodes : crédit immédiat (mobile money, banque, carte)
    const [deposit] = await db.$transaction([
      db.deposit.create({
        data: {
          userId,
          amount,
          currency: cur,
          method: method || 'mobile_money',
          status: 'completed',
        },
      }),
      db.user.update({
        where: { id: userId },
        data: isFC
          ? { realBalanceFC: { increment: amount } }
          : { realBalance: { increment: amount } },
      }),
      db.transaction.create({
        data: {
          type: 'deposit',
          amount,
          fee: 0,
          currency: cur,
          status: 'completed',
          senderId: userId,
          receiverId: userId,
          description: `${depositMethodLabel(method || 'mobile_money')} de ${amountLabel}`,
        },
      }),
      db.notification.create({
        data: {
          userId,
          title: 'Dépôt effectué',
          message: `Votre dépôt de ${amountLabel} via ${depositMethodLabel(method || 'mobile_money')} a été effectué.`,
          type: 'general',
        },
      }),
    ])

    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true },
    })

    updateBalanceAndNotify(userId, updatedUser?.realBalance, updatedUser?.realBalanceFC).catch(() => {})

    return NextResponse.json({
      success: true,
      deposit: {
        id: deposit.id,
        userId: deposit.userId,
        amount: deposit.amount,
        currency: deposit.currency,
        method: deposit.method,
        status: deposit.status,
        createdAt: deposit.createdAt,
      },
      updatedBalances: updatedUser,
    })
  } catch (error) {
    console.error('Deposit error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
