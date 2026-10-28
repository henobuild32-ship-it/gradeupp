import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security'
import { requireUser } from '@/lib/auth'
import { formatAmount } from '@/lib/tx-labels'
import { normalizeCurrency } from '@/lib/currency'

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
    const currency = normalizeCurrency(withdrawal.currency)
    const withdrawalRequestId = (withdrawal as typeof withdrawal & { clientRequestId?: string | null }).clientRequestId

    if (action === 'validate') {
      let updated
      try {
        updated = await db.$transaction(async (tx) => {
          const claim = await tx.withdrawal.updateMany({
            where: { id: withdrawalId, agentId: auth.userId, status: 'pending' },
            data: { status: 'completed' },
          })
          if (claim.count !== 1) throw new Error('WITHDRAWAL_ALREADY_PROCESSED')

          const linkedTransactions = await tx.transaction.findMany({
            where: {
              senderId: withdrawal.userId,
              receiverId: withdrawal.agentId!,
              type: 'withdrawal',
              status: 'pending',
              ...(withdrawalRequestId
                ? { clientRequestId: withdrawalRequestId }
                : { amount: withdrawal.amount, fee: withdrawal.fee, currency: withdrawal.currency }),
            },
            select: { id: true },
            take: 2,
          })
          if (linkedTransactions.length !== 1) throw new Error('WITHDRAWAL_TRANSACTION_AMBIGUOUS')

          // Atomic claim of this withdrawal prevents concurrent double cash-outs.
          const balanceField = currency === 'CDF' ? 'realBalanceFC' : 'realBalance'
          const debit = await tx.user.updateMany({
            where: { id: withdrawal.agentId!, [balanceField]: { gte: withdrawal.amount } },
            data: { [balanceField]: { decrement: withdrawal.amount } },
          })
          if (debit.count !== 1) throw new Error('AGENT_INSUFFICIENT_BALANCE')

          const txUpdate = await tx.transaction.updateMany({
            where: { id: linkedTransactions[0].id, status: 'pending' },
            data: { status: 'completed' },
          })
          if (txUpdate.count !== 1) throw new Error('WITHDRAWAL_TRANSACTION_ALREADY_PROCESSED')

          await tx.notification.create({
            data: {
              userId: withdrawal.userId,
              title: 'Retrait validé',
              message: `Votre retrait de ${amountLabel} a été validé. Montant remis par l’agent : ${formatAmount(withdrawal.amount, currency)}.`,
              type: 'withdrawal_validated',
            },
          })

          return { id: withdrawal.id, status: 'completed' }
        })
      } catch (error) {
        if (error instanceof Error && error.message === 'AGENT_INSUFFICIENT_BALANCE') {
          return NextResponse.json({ success: false, message: 'Solde agent insuffisant pour valider ce retrait. Rechargez votre compte agent.' }, { status: 400 })
        }
        if (error instanceof Error && (error.message === 'WITHDRAWAL_ALREADY_PROCESSED' || error.message === 'WITHDRAWAL_TRANSACTION_ALREADY_PROCESSED')) {
          return NextResponse.json({ success: false, message: 'Ce retrait a déjà été traité.' }, { status: 409 })
        }
        if (error instanceof Error && error.message === 'WITHDRAWAL_TRANSACTION_AMBIGUOUS') {
          return NextResponse.json({ success: false, message: 'La transaction liée est ambiguë. Le retrait doit être vérifié par un administrateur.' }, { status: 409 })
        }
        throw error
      }

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            message: 'Solde agent insuffisant pour valider ce retrait. Rechargez votre compte agent.',
          },
          { status: 400 },
        )
      }

      await logSecurityEvent({
        userId: auth.userId,
        action: 'agent_validate_withdrawal',
        details: `L'agent ${withdrawal.agent?.name || withdrawal.agent?.pseudo || 'N/A'} (${withdrawal.agent?.agentCode || withdrawal.agent?.agentNumber || 'N/A'}) a validé le retrait de ${amountLabel} pour ${clientLabel}`,
        riskLevel: 'low',
      }).catch((error) => console.error('Audit log failed after withdrawal validation:', error))

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
      if (withdrawal.fee > 0 && (withdrawal as typeof withdrawal & { feeFromBonus?: boolean | null }).feeFromBonus == null) {
        return NextResponse.json({
          success: false,
          message: 'La source des frais de cet ancien retrait est inconnue. Un administrateur doit contrôler le remboursement.',
          code: 'WITHDRAWAL_REFUND_REVIEW_REQUIRED',
        }, { status: 409 })
      }
      try {
        await db.$transaction(async (tx) => {
          const claim = await tx.withdrawal.updateMany({
            where: { id: withdrawalId, agentId: auth.userId, status: 'pending' },
            data: { status: 'failed' },
          })
          if (claim.count !== 1) throw new Error('WITHDRAWAL_ALREADY_PROCESSED')

          const linkedTransactions = await tx.transaction.findMany({
            where: {
              senderId: withdrawal.userId,
              receiverId: withdrawal.agentId!,
              type: 'withdrawal',
              status: 'pending',
              ...(withdrawalRequestId
                ? { clientRequestId: withdrawalRequestId }
                : { amount: withdrawal.amount, fee: withdrawal.fee, currency: withdrawal.currency }),
            },
            select: { id: true },
            take: 2,
          })
          if (linkedTransactions.length !== 1) throw new Error('WITHDRAWAL_TRANSACTION_AMBIGUOUS')
          const txUpdate = await tx.transaction.updateMany({
            where: { id: linkedTransactions[0].id, status: 'pending' },
            data: { status: 'failed' },
          })
          if (txUpdate.count !== 1) throw new Error('WITHDRAWAL_TRANSACTION_ALREADY_PROCESSED')

          const cashField = currency === 'CDF' ? 'realBalanceFC' : 'realBalance'
          const bonusField = currency === 'CDF' ? 'bonusBalanceFC' : 'bonusBalance'
          const feeFromBonus = (withdrawal as typeof withdrawal & { feeFromBonus?: boolean }).feeFromBonus === true
          await tx.user.update({
            where: { id: withdrawal.userId },
            data: {
              [cashField]: { increment: withdrawal.amount + (feeFromBonus ? 0 : withdrawal.fee) },
              ...(feeFromBonus ? { [bonusField]: { increment: withdrawal.fee } } : {}),
            },
          })
          await tx.notification.create({
            data: {
              userId: withdrawal.userId,
              title: 'Retrait refusé',
              message: `Votre retrait de ${amountLabel} a été refusé. Le montant et les frais ont été remboursés sur leur solde d’origine.`,
              type: 'general',
            },
          })
        })
      } catch (error) {
        if (error instanceof Error && (error.message === 'WITHDRAWAL_ALREADY_PROCESSED' || error.message === 'WITHDRAWAL_TRANSACTION_ALREADY_PROCESSED')) {
          return NextResponse.json({ success: false, message: 'Ce retrait a déjà été traité.' }, { status: 409 })
        }
        if (error instanceof Error && error.message === 'WITHDRAWAL_TRANSACTION_AMBIGUOUS') {
          return NextResponse.json({ success: false, message: 'La transaction liée est ambiguë. Le retrait doit être vérifié par un administrateur.' }, { status: 409 })
        }
        throw error
      }

      await logSecurityEvent({
        userId: auth.userId,
        action: 'agent_refuse_withdrawal',
        details: `L'agent ${withdrawal.agent?.name || withdrawal.agent?.pseudo || 'N/A'} a refusé le retrait de ${amountLabel} pour ${clientLabel}`,
        riskLevel: 'low',
      }).catch((error) => console.error('Audit log failed after withdrawal refusal:', error))

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
