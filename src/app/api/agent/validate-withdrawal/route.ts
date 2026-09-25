import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security'
import { requireUser } from '@/lib/auth'
import { formatAmount } from '@/lib/tx-labels'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { withdrawalId, action } = body as {
      withdrawalId: string
      action: 'validate' | 'refuse'
    }

    if (!withdrawalId || !action || !['validate', 'refuse'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants ou invalides' },
        { status: 400 }
      )
    }

    const authAgent = await db.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        role: true,
        validationStatus: true,
        suspended: true,
        tempBlocked: true,
      },
    })

    if (!authAgent || authAgent.role !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux agents' },
        { status: 403 }
      )
    }

    if (authAgent.validationStatus !== 'validated') {
      return NextResponse.json(
        { success: false, message: 'Votre compte agent n\'est pas encore validé' },
        { status: 403 }
      )
    }

    if (authAgent.suspended || authAgent.tempBlocked) {
      return NextResponse.json(
        { success: false, message: 'Votre compte agent est suspendu ou bloqué' },
        { status: 403 }
      )
    }

    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        user: { select: { id: true, name: true, pseudo: true, phone: true, realBalance: true, realBalanceFC: true } },
        agent: { select: { id: true, name: true, pseudo: true, agentCode: true, agentNumber: true } },
      },
    })

    if (!withdrawal) {
      return NextResponse.json(
        { success: false, message: 'Retrait non trouvé' },
        { status: 404 }
      )
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Ce retrait a déjà été traité' },
        { status: 400 }
      )
    }

    if (withdrawal.agentId !== auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      )
    }

    const amountLabel = formatAmount(withdrawal.amount, withdrawal.currency)
    const clientLabel = withdrawal.user?.name || withdrawal.user?.pseudo || withdrawal.user?.phone || 'le client'

    if (action === 'validate') {
      const isFC = withdrawal.currency === 'FC'
      const updated = await db.$transaction(async (tx) => {
        // Vraie logique cash : l'agent remet le liquide au client → son compte est débité
        const debit = await tx.user.updateMany({
          where: {
            id: withdrawal.agentId!,
            ...(isFC
              ? { realBalanceFC: { gte: withdrawal.amount } }
              : { realBalance: { gte: withdrawal.amount } }),
          },
          data: isFC
            ? { realBalanceFC: { decrement: withdrawal.amount } }
            : { realBalance: { decrement: withdrawal.amount } },
        })
        if (debit.count !== 1) throw new Error('AGENT_INSUFFICIENT_BALANCE')

        const done = await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: { status: 'completed' },
        })

        await tx.transaction.updateMany({
          where: {
            senderId: withdrawal.userId,
            receiverId: withdrawal.agentId!,
            type: 'withdrawal',
            status: 'pending',
          },
          data: { status: 'completed' },
        })

        return done
      }).catch((err: unknown) => {
        if (err instanceof Error && err.message === 'AGENT_INSUFFICIENT_BALANCE') {
          return null
        }
        throw err
      })

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            message: 'Solde agent insuffisant pour valider ce retrait. Rechargez votre compte agent.',
          },
          { status: 400 },
        )
      }

      if (withdrawal.agent) {
        await logSecurityEvent({
          userId: withdrawal.agent.id,
          action: 'agent_validate_withdrawal',
          details: `L'agent ${withdrawal.agent.name || withdrawal.agent.pseudo || 'N/A'} (${withdrawal.agent.agentCode || withdrawal.agent.agentNumber || 'N/A'}) a validé le retrait de ${amountLabel} pour ${clientLabel}`,
          riskLevel: 'low',
        })
      }

      await db.notification.create({
        data: {
          userId: withdrawal.userId,
          title: 'Retrait validé',
          message: `Votre retrait de ${amountLabel} a été validé. Montant net: ${formatAmount(withdrawal.amount - withdrawal.fee, withdrawal.currency)}.`,
          type: 'withdrawal_validated',
        },
      })

      try {
        const { sendPushToUser } = await import('@/lib/push');
        await sendPushToUser(withdrawal.userId, {
          title: 'Retrait validé',
          body: `Votre retrait de ${amountLabel} a été validé par l'agent.`,
          url: '/history',
        });
      } catch (err) {
        console.error('Push notification error:', err);
      }

      return NextResponse.json({
        success: true,
        message: 'Retrait validé avec succès',
        withdrawal: {
          id: updated.id,
          status: updated.status,
        },
      })
    }

    if (action === 'refuse') {
      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'failed' },
      })

      await db.transaction.updateMany({
        where: {
          senderId: withdrawal.userId,
          receiverId: withdrawal.agentId!,
          type: 'withdrawal',
          status: 'pending',
        },
        data: { status: 'failed' },
      })

      const isFC = withdrawal.currency === 'FC'
      await db.user.update({
        where: { id: withdrawal.userId },
        data: isFC
          ? { realBalanceFC: { increment: withdrawal.amount + withdrawal.fee } }
          : { realBalance: { increment: withdrawal.amount + withdrawal.fee } },
      })

      if (withdrawal.agent) {
        await logSecurityEvent({
          userId: withdrawal.agent.id,
          action: 'agent_refuse_withdrawal',
          details: `L'agent ${withdrawal.agent.name || withdrawal.agent.pseudo || 'N/A'} a refusé le retrait de ${amountLabel} pour ${clientLabel}`,
          riskLevel: 'low',
        })
      }

      await db.notification.create({
        data: {
          userId: withdrawal.userId,
          title: 'Retrait refusé',
          message: `Votre retrait de ${amountLabel} a été refusé. Le montant a été remboursé sur votre solde.`,
          type: 'general',
        },
      })

      try {
        const { sendPushToUser } = await import('@/lib/push');
        await sendPushToUser(withdrawal.userId, {
          title: 'Retrait refusé',
          body: `Votre retrait de ${amountLabel} a été refusé par l'agent.`,
          url: '/history',
        });
      } catch (err) {
        console.error('Push notification error:', err);
      }

      return NextResponse.json({
        success: true,
        message: 'Retrait refusé',
        withdrawal: {
          id: withdrawalId,
          status: 'failed',
        },
      })
    }

    return NextResponse.json(
      { success: false, message: 'Action non reconnue' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Validate withdrawal error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
