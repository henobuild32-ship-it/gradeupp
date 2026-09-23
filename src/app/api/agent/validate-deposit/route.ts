import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security'
import { requireUser } from '@/lib/auth'
import { updateBalanceAndNotify } from '@/lib/notifications'
import { formatAmount, depositMethodLabel } from '@/lib/tx-labels'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { depositId, action } = body as {
      depositId: string
      action: 'validate' | 'refuse'
    }

    if (!depositId || !action || !['validate', 'refuse'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants ou invalides' },
        { status: 400 }
      )
    }

    const agent = await db.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        pseudo: true,
        role: true,
        agentCode: true,
        agentNumber: true,
        validationStatus: true,
        suspended: true,
        tempBlocked: true,
        realBalance: true,
        realBalanceFC: true,
      },
    })

    if (!agent || agent.role !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux agents' },
        { status: 403 }
      )
    }

    if (agent.validationStatus !== 'validated') {
      return NextResponse.json(
        { success: false, message: 'Votre compte agent n\'est pas encore validé' },
        { status: 403 }
      )
    }

    if (agent.suspended || agent.tempBlocked) {
      return NextResponse.json(
        { success: false, message: 'Votre compte agent est suspendu ou bloqué' },
        { status: 403 }
      )
    }

    const deposit = await db.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: { select: { id: true, name: true, pseudo: true, phone: true } },
      },
    })

    if (!deposit) {
      return NextResponse.json(
        { success: false, message: 'Dépôt non trouvé' },
        { status: 404 }
      )
    }

    if (deposit.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Ce dépôt a déjà été traité' },
        { status: 400 }
      )
    }

    if (deposit.agentId !== auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      )
    }

    const amountLabel = formatAmount(deposit.amount, deposit.currency)
    const clientLabel =
      deposit.user?.name || deposit.user?.pseudo || deposit.user?.phone || 'le client'

    if (action === 'validate') {
      const isFC = deposit.currency === 'FC'
      const agentBalanceField = isFC ? 'realBalanceFC' : 'realBalance'
      const clientBalanceField = isFC ? 'realBalanceFC' : 'realBalance'

      const description = `${depositMethodLabel(deposit.method)} de ${amountLabel} pour ${clientLabel}`

      const result = await db.$transaction(async (tx) => {
        const debit = await tx.user.updateMany({
          where: {
            id: auth.userId,
            [agentBalanceField]: { gte: deposit.amount },
          },
          data: { [agentBalanceField]: { decrement: deposit.amount } },
        })
        if (debit.count !== 1) throw new Error('AGENT_INSUFFICIENT_BALANCE')

        await tx.user.update({
          where: { id: deposit.userId },
          data: { [clientBalanceField]: { increment: deposit.amount } },
        })

        const updated = await tx.deposit.update({
          where: { id: depositId },
          data: { status: 'completed' },
        })

        await tx.transaction.create({
          data: {
            type: 'deposit',
            amount: deposit.amount,
            fee: 0,
            currency: deposit.currency,
            status: 'completed',
            senderId: auth.userId,
            receiverId: deposit.userId,
            agentId: auth.userId,
            description,
          },
        })

        await tx.notification.create({
          data: {
            userId: deposit.userId,
            title: 'Dépôt validé',
            message: `Votre dépôt de ${amountLabel} via l'agent ${agent.agentCode || agent.agentNumber || ''} a été validé et crédité.`,
            type: 'general',
          },
        })

        return updated
      }).catch((err: unknown) => {
        if (err instanceof Error && err.message === 'AGENT_INSUFFICIENT_BALANCE') {
          return null
        }
        throw err
      })

      if (!result) {
        return NextResponse.json(
          { success: false, message: 'Solde agent insuffisant pour valider ce dépôt' },
          { status: 400 }
        )
      }

      const updatedAgent = await db.user.findUnique({
        where: { id: auth.userId },
        select: { realBalance: true, realBalanceFC: true },
      })
      const updatedClient = await db.user.findUnique({
        where: { id: deposit.userId },
        select: { realBalance: true, realBalanceFC: true },
      })
      updateBalanceAndNotify(auth.userId, updatedAgent?.realBalance, updatedAgent?.realBalanceFC).catch(() => {})
      updateBalanceAndNotify(deposit.userId, updatedClient?.realBalance, updatedClient?.realBalanceFC).catch(() => {})

      await logSecurityEvent({
        userId: auth.userId,
        action: 'agent_validate_deposit',
        details: `L'agent ${agent.name || agent.pseudo || 'N/A'} (${agent.agentCode || agent.agentNumber || 'N/A'}) a validé le dépôt de ${amountLabel} pour ${clientLabel}`,
        riskLevel: 'low',
      })

      return NextResponse.json({
        success: true,
        message: 'Dépôt validé et crédité',
        deposit: { id: result.id, status: result.status },
      })
    }

    // refuse
    const failed = await db.deposit.update({
      where: { id: depositId },
      data: { status: 'failed' },
    })

    await db.notification.create({
      data: {
        userId: deposit.userId,
        title: 'Dépôt refusé',
        message: `Votre demande de dépôt de ${amountLabel} a été refusée par l'agent. Aucun montant n'a été crédité.`,
        type: 'general',
      },
    })

    await logSecurityEvent({
      userId: auth.userId,
      action: 'agent_refuse_deposit',
      details: `L'agent ${agent.name || agent.pseudo || 'N/A'} a refusé le dépôt de ${amountLabel} pour ${clientLabel}`,
      riskLevel: 'low',
    })

    return NextResponse.json({
      success: true,
      message: 'Dépôt refusé',
      deposit: { id: failed.id, status: failed.status },
    })
  } catch (error) {
    console.error('Validate deposit error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
