import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findActiveAgentByIdentifier } from '@/lib/agents';
import { requireUser } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { safeDeductWithFee } from '@/lib/balance';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    // Rate limit: 3 withdrawals per hour per user
    const rateLimit = checkRateLimit({
      windowMs: 60 * 60 * 1000,
      maxRequests: 3,
      key: `withdraw:${auth.userId}`,
    })
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn)
    }

    const body = await request.json();
    const { amount, currency, method, agentCode } = body as {
      amount: number;
      currency?: string;
      method?: string;
      agentCode?: string;
    };

    const userId = auth.userId

    if (
      typeof amount !== 'number' ||
      amount <= 0 ||
      !currency ||
      !['USD', 'FC'].includes(currency) ||
      !agentCode?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Montant positif, devise (USD/FC) et code agent requis',
        },
        { status: 400 },
      );
    }

    const [user, agent] = await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      findActiveAgentByIdentifier(agentCode.trim()),
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 },
      );
    }

    if (user.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Votre compte est temporairement bloqué.' }, { status: 403 });
    }

    if (user.suspended) {
      return NextResponse.json({ success: false, message: 'Votre compte est suspendu.' }, { status: 403 });
    }

    if (!agent) {
      return NextResponse.json(
        { success: false, message: 'Agent non trouvé. Vérifiez le code ou numéro agent.' },
        { status: 404 },
      );
    }

    if (agent.id === userId) {
      return NextResponse.json(
        { success: false, message: 'Vous ne pouvez pas valider votre propre retrait comme agent.' },
        { status: 400 },
      );
    }

    // Referral limit check: Referred users can withdraw up to $20 only
    if (user.referredBy) {
      let exchangeRate = 2500;
      try {
        const rateConfig = await db.systemConfig.findUnique({
          where: { key: 'exchange_rate_usd_fc' },
        });
        if (rateConfig && rateConfig.value) {
          const val = parseFloat(rateConfig.value);
          if (!isNaN(val) && val > 0) exchangeRate = val;
        }
      } catch (e) {
        console.error('Error fetching exchange rate:', e);
      }

      const userWithdrawals = await db.withdrawal.findMany({
        where: {
          userId,
          status: { in: ['completed', 'pending'] },
        },
      });

      let totalWithdrawnUSD = 0;
      for (const w of userWithdrawals) {
        if (w.currency === 'USD') {
          totalWithdrawnUSD += w.amount;
        } else {
          totalWithdrawnUSD += w.amount / exchangeRate;
        }
      }

      const currentWithdrawalUSD = currency === 'USD' ? amount : amount / exchangeRate;
      if (totalWithdrawnUSD + currentWithdrawalUSD > 20) {
        return NextResponse.json(
          {
            success: false,
            message: `Limite de retrait dépassée. Les utilisateurs parrainés peuvent retirer un maximum de 20.00 USD au total. Déjà retiré/en cours: ${totalWithdrawnUSD.toFixed(2)} USD`,
          },
          { status: 400 },
        );
      }
    }

    const cur = currency;
    const fee = round2(amount * 0.007);

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeductWithFee(userId, amount, fee, cur);
    if (!deductResult.success) {
      return NextResponse.json(
        { success: false, message: deductResult.message },
        { status: 400 },
      );
    }

    // Create withdrawal, transaction record, and notify
    const [withdrawal] = await db.$transaction([
      db.withdrawal.create({
        data: {
          userId,
          amount,
          fee,
          currency: cur,
          method: method || 'agent',
          status: 'pending',
          agentId: agent.id,
        },
      }),
      db.transaction.create({
        data: {
          type: 'withdrawal',
          amount,
          fee,
          currency: cur,
          status: 'pending',
          senderId: userId,
          receiverId: agent.id,
          agentId: agent.id,
          description: `Retrait via agent ${agent.agentNumber || agent.agentCode}`,
        },
      }),
      db.notification.create({
        data: {
          userId,
          title: 'Retrait en cours de validation',
          message: `Votre retrait de ${amount.toFixed(2)} ${cur} (frais : ${fee.toFixed(2)} ${cur}) via l'agent ${agent.agentNumber || agent.agentCode} a été soumis et est en attente de validation par l'agent.`,
          type: 'withdrawal_validated',
        },
      }),
    ]);

    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true },
    });

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        fee: withdrawal.fee,
        currency: withdrawal.currency,
        method: withdrawal.method,
        status: withdrawal.status,
        agentId: withdrawal.agentId,
        createdAt: withdrawal.createdAt,
      },
      updatedBalances: updatedUser,
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 },
    );
  }
}
