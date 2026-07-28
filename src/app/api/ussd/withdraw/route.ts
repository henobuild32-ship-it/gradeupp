import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { findActiveAgentByIdentifier } from '@/lib/agents';
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
      return NextResponse.json({ success: false, message: 'Agent non trouvé. Vérifiez le code agent.' }, { status: 404 });
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
          status: 'completed',
          agentId: agent.id,
        },
      });
      await tx.user.update({
        where: { id: agent.id },
        data: isFC
          ? { realBalanceFC: { increment: amount } }
          : { realBalance: { increment: amount } },
      });
      await tx.transaction.create({
        data: {
          type: 'withdrawal',
          amount,
          fee,
          currency: cur,
          status: 'completed',
          senderId: userId,
          receiverId: agent.id,
          agentId: agent.id,
          description: `Retrait de ${amount.toFixed(2)} ${cur} via agent ${agent.agentCode}`,
        },
      });
      await tx.notification.create({
        data: {
          userId,
          title: 'Retrait effectué',
          message: `Votre retrait de ${amount.toFixed(2)} ${cur} (frais: ${fee.toFixed(2)} ${cur}) a été effectué via l'agent ${agent.agentCode}.`,
          type: 'withdrawal_validated',
        },
      });
      return withdrawal;
    });

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
