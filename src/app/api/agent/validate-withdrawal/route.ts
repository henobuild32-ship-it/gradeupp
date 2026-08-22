import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security'
import { requireUser } from '@/lib/auth'

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

    // Find the withdrawal
    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        user: { select: { id: true, name: true, phone: true, realBalance: true, realBalanceFC: true } },
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

    if (action === 'validate') {
      // Credit the agent only after validation
      const isFC = withdrawal.currency === 'FC';
      const [updated] = await db.$transaction([
        db.withdrawal.update({
          where: { id: withdrawalId },
          data: { status: 'completed' },
        }),
        db.user.update({
          where: { id: withdrawal.agentId! },
          data: isFC
            ? { realBalanceFC: { increment: withdrawal.amount } }
            : { realBalance: { increment: withdrawal.amount } },
        }),
        db.transaction.updateMany({
          where: {
            senderId: withdrawal.userId,
            receiverId: withdrawal.agentId!,
            type: 'withdrawal',
            status: 'pending',
          },
          data: { status: 'completed' },
        }),
      ]);

      // Log agent validation
      if (withdrawal.agent) {
        await logSecurityEvent({
          userId: withdrawal.agent.id,
          action: 'agent_validate_withdrawal',
          details: `L'agent ${withdrawal.agent.name || withdrawal.agent.pseudo || 'N/A'} (${withdrawal.agent.agentCode || withdrawal.agent.agentNumber || 'N/A'}) a VALIDE le retrait de ${withdrawal.amount.toFixed(2)} ${withdrawal.currency} pour le client ${withdrawal.user.phone}`,
          riskLevel: 'low',
        })
      }

      // Create notification for client
      await db.notification.create({
        data: {
          userId: withdrawal.userId,
          title: 'Retrait validé',
          message: `Votre retrait de ${withdrawal.currency === 'FC' ? '' : '$'}${withdrawal.amount.toFixed(2)} ${withdrawal.currency} a été validé. Montant net: ${withdrawal.currency === 'FC' ? '' : '$'}${(withdrawal.amount - withdrawal.fee).toFixed(2)} ${withdrawal.currency}.`,
          type: 'withdrawal_validated',
        },
      })

      // Send push notification
      try {
        const { sendPushToUser } = await import('@/lib/push');
        await sendPushToUser(withdrawal.userId, {
          title: 'Retrait validé',
          body: `Votre retrait de ${withdrawal.amount.toFixed(2)} ${withdrawal.currency} a été validé par l'agent.`,
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
      // Refund the client: add back amount + fee
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

      // Refund the client's balance based on currency
      const isFC = withdrawal.currency === 'FC';
      await db.user.update({
        where: { id: withdrawal.userId },
        data: isFC
          ? { realBalanceFC: { increment: withdrawal.amount + withdrawal.fee } }
          : { realBalance: { increment: withdrawal.amount + withdrawal.fee } },
      })

      // Log agent refusal
      if (withdrawal.agent) {
        await logSecurityEvent({
          userId: withdrawal.agent.id,
          action: 'agent_refuse_withdrawal',
          details: `L'agent ${withdrawal.agent.name || withdrawal.agent.pseudo || 'N/A'} (${withdrawal.agent.agentCode || withdrawal.agent.agentNumber || 'N/A'}) a REFUSE le retrait de ${withdrawal.amount.toFixed(2)} ${withdrawal.currency} pour le client ${withdrawal.user.phone}`,
          riskLevel: 'low',
        })
      }

      // Create notification for client
      await db.notification.create({
        data: {
          userId: withdrawal.userId,
          title: 'Retrait refusé',
          message: `Votre retrait de ${withdrawal.currency === 'FC' ? '' : '$'}${withdrawal.amount.toFixed(2)} ${withdrawal.currency} a été refusé. Le montant a été remboursé sur votre solde.`,
          type: 'general',
        },
      })

      // Send push notification
      try {
        const { sendPushToUser } = await import('@/lib/push');
        await sendPushToUser(withdrawal.userId, {
          title: 'Retrait refusé',
          body: `Votre retrait de ${withdrawal.amount.toFixed(2)} ${withdrawal.currency} a été refusé par l'agent.`,
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
