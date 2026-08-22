import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { findActiveAgentByIdentifier } from '@/lib/agents';
import { checkChildBalanceLimit, logSecurityEvent } from '@/lib/security';

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

    const agent = await findActiveAgentByIdentifier(agentCode);
    if (!agent) {
      return NextResponse.json({ success: false, message: 'Agent non trouvé. Vérifiez le code agent.' }, { status: 404 });
    }

    const isFC = currency === 'FC';

    const limitCheck = await checkChildBalanceLimit(userId, amount, currency || 'USD');
    if (!limitCheck.allowed) {
      return NextResponse.json({ success: false, message: limitCheck.message }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      await logSecurityEvent({
        userId: agent.id,
        action: 'agent_ussd_deposit',
        details: `L'agent ${agent.name || agent.pseudo} (${agent.agentCode || agent.agentNumber}) a effectué un dépôt USSD de ${amount} ${currency || 'USD'} pour le client (ID: ${userId})`,
        riskLevel: 'low',
      });
      const deposit = await tx.deposit.create({
        data: {
          userId,
          amount,
          currency: currency || 'USD',
          method: 'ussd_agent',
          status: 'completed',
          agentId: agent.id,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: isFC
          ? { realBalanceFC: { increment: amount } }
          : { realBalance: { increment: amount } },
      });
      await tx.transaction.create({
        data: {
          type: 'deposit',
          amount,
          fee: 0,
          currency: currency || 'USD',
          status: 'completed',
          senderId: agent.id,
          receiverId: userId,
          agentId: agent.id,
          description: `Dépôt de ${amount.toFixed(2)} ${currency} via agent ${agent.agentCode}`,
        },
      });
      await tx.notification.create({
        data: {
          userId,
          title: 'Dépôt reçu',
          message: `Votre dépôt de ${amount.toFixed(2)} ${currency} a été effectué via l'agent ${agent.agentCode}.`,
          type: 'general',
        },
      });
      return deposit;
    });

    // Push notifications to both client and agent
    const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
    if (sendPushToUser) {
      const amt = isFC ? amount.toLocaleString('fr-FR') : '$' + amount.toFixed(2)
      sendPushToUser(userId, {
        title: 'Dépôt reçu',
        body: `Dépôt de ${amt} ${currency || 'USD'} effectué par l'agent ${agent.businessName || agent.name || 'TRAIT'}.`,
        url: '/home',
      }).catch(() => {})
      sendPushToUser(agent.id, {
        title: 'Dépôt effectué',
        body: `Dépôt de ${amt} ${currency || 'USD'} pour ${user.name || user.pseudo || user.phone}.`,
        url: '/home',
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      deposit: {
        id: result.id,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        agentCode: agent.agentCode,
      },
    });
  } catch (error) {
    console.error('USSD deposit error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
