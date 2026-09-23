import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { findAgentByIdentifier, findActiveAgentByIdentifier } from '@/lib/agents';
import { safeDeductWithFee } from '@/lib/balance';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { userId, agentCode, amount, currency } = body;

    if (auth.userId !== userId) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 });
    }

    if (!userId || !agentCode || !amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Tous les champs sont requis' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
    }
    if (user.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Votre compte est temporairement bloqué.' }, { status: 403 });
    }
    if (user.suspended) {
      return NextResponse.json({ success: false, message: 'Votre compte est suspendu.' }, { status: 403 });
    }

    const agent = await findActiveAgentByIdentifier(agentCode);
    if (!agent) {
      const found = await findAgentByIdentifier(agentCode);
      if (found?.suspended) {
        return NextResponse.json({ success: false, message: 'Cet agent est suspendu.' }, { status: 403 });
      }
      if (found && found.validationStatus !== 'validated') {
        return NextResponse.json({ success: false, message: "Cet agent n'est pas encore validé." }, { status: 403 });
      }
      return NextResponse.json({ success: false, message: 'Agent non trouvé. Vérifiez le code agent (ex: AGT-123456).' }, { status: 404 });
    }

    const isFC = currency === 'FC';
    const cur = currency || 'USD';
    const fee = Math.round(amount * 0.01 * 100) / 100;

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeductWithFee(userId, amount, fee, cur);
    if (!deductResult.success) {
      return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amount,
          fee,
          currency: cur,
          method: 'ussd_agent',
          status: 'pending',
          agentId: agent.id,
        },
      });
      await tx.transaction.create({
        data: {
          type: 'withdrawal',
          amount,
          fee,
          currency: cur,
          status: 'pending',
          senderId: userId,
          receiverId: agent.id,
          agentId: agent.id,
          description: `Retrait de ${amount.toFixed(2)} ${cur} via agent ${agent.agentCode || agent.agentNumber || agent.name || 'TRAIT'}`,
        },
      });
      await tx.notification.create({
        data: {
          userId,
          title: 'Retrait en cours de validation',
          message: `Votre demande de retrait de ${amount.toFixed(2)} ${cur} (frais: ${fee.toFixed(2)} ${cur}) via l'agent ${agent.agentCode} est en attente de validation.`,
          type: 'withdrawal_validated',
        },
      });
      // Notify Agent
      await tx.notification.create({
        data: {
          userId: agent.id,
          title: 'Nouvelle demande de retrait',
          message: `Le client ${user.phone} demande un retrait de ${amount.toFixed(2)} ${cur}.`,
          type: 'general',
        },
      });
      return withdrawal;
    });

    // Push notifications to both client and agent
    const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
    if (sendPushToUser) {
      const amt = isFC ? amount.toLocaleString('fr-FR') : '$' + amount.toFixed(2)
      sendPushToUser(userId, {
        title: 'Retrait en attente',
        body: `Demande de retrait de ${amt} ${cur} envoyée à l'agent ${agent.businessName || agent.name || 'TRAIT'}.`,
        url: '/history',
      }).catch(() => {})
      sendPushToUser(agent.id, {
        title: 'Nouvelle demande de retrait (USSD)',
        body: `Le client ${user.phone} souhaite retirer ${amt} ${cur}.`,
        url: '/agent-pending',
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: result.id,
        amount: result.amount,
        fee: result.fee,
        currency: result.currency,
        status: result.status,
        agentCode: agent.agentCode,
      },
    });
  } catch (error) {
    console.error('USSD withdraw error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
