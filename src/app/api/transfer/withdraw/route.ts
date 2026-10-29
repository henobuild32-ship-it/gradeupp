import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { findAgentByIdentifier, findActiveAgentByIdentifier } from '@/lib/agents';
import { requireUser, verifyPinWithAttempts } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { formatAmount } from '@/lib/tx-labels';
import { getUsdCdfExchangeRate } from '@/lib/currency-server';
import { calculateCurrencyFee, normalizeCurrency, roundCurrencyAmount } from '@/lib/currency';
import { checkDailyTransactionLimit, checkDailyWithdrawalLimit, getDayWindow, getFinancialPolicy, getUserDailyLimits, lockDailyFinancialOperations } from '@/lib/financial-policy';

function conflictResponse() {
  return NextResponse.json({ success: false, message: 'Cette référence de demande est déjà associée à une autre opération.' }, { status: 409 });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const { amount: rawAmount, currency, method, agentCode, pin, clientRequestId } = body as {
      amount?: number;
      currency?: string;
      method?: string;
      agentCode?: string;
      pin?: string;
      clientRequestId?: string;
    };

    if (method !== undefined && method !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Les retraits par prestataire externe ne sont pas activés. Utilisez un agent Trait.' },
        { status: 410 },
      );
    }

    if (
      typeof rawAmount !== 'number' || !Number.isFinite(rawAmount) || rawAmount <= 0 || rawAmount > 10_000_000 ||
      !currency || !['USD', 'CDF', 'FC'].includes(currency) || !agentCode?.trim() ||
      (clientRequestId !== undefined && (typeof clientRequestId !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(clientRequestId)))
    ) {
      return NextResponse.json({ success: false, message: 'Montant positif, devise USD/CDF et code agent requis.' }, { status: 400 });
    }

    const amount = roundCurrencyAmount(rawAmount);
    if (amount <= 0) {
      return NextResponse.json({ success: false, message: 'Le montant doit être d’au moins 0,01.' }, { status: 400 });
    }

    const userId = auth.userId;
    const cur = normalizeCurrency(currency);
    const requestId = clientRequestId;
    const agentCodeInput = agentCode.trim();
    const requestFingerprint = requestId
      ? createHash('sha256').update(JSON.stringify({
          amount: amount.toFixed(2),
          currency: cur,
          method: 'agent',
          agentCode: agentCodeInput.toUpperCase(),
        })).digest('hex')
      : null;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
    if (user.tempBlocked) return NextResponse.json({ success: false, message: 'Votre compte est temporairement bloqué.' }, { status: 403 });
    if (user.suspended) return NextResponse.json({ success: false, message: 'Votre compte est suspendu.' }, { status: 403 });
    if (!user.pin || typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ success: false, message: 'Code PIN TRAIT requis.' }, { status: 400 });
    }

    const pinResult = await verifyPinWithAttempts(userId, pin);
    if (!pinResult.valid) {
      return NextResponse.json({
        success: false,
        message: pinResult.blocked ? 'Trop de tentatives. Compte bloqué temporairement.' : 'PIN incorrect',
      }, { status: pinResult.blocked ? 429 : 401 });
    }

    const existingWithdrawal = requestId
      ? await (db.withdrawal as any).findUnique({
          where: { userId_clientRequestId: { userId, clientRequestId: requestId } },
          include: { agent: { select: { id: true, agentCode: true, agentNumber: true, name: true } } },
        })
      : null;

    const responseForExisting = async (existing: NonNullable<typeof existingWithdrawal>) => {
      if (existing.requestFingerprint !== requestFingerprint) return conflictResponse();
      const [transaction, balances, dailyLimits] = await Promise.all([
        requestId ? db.transaction.findUnique({ where: { senderId_clientRequestId: { senderId: userId, clientRequestId: requestId } } }) : null,
        db.user.findUnique({ where: { id: userId }, select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true } }),
        getUserDailyLimits(userId).catch(() => null),
      ]);
      return NextResponse.json({
        success: true,
        duplicate: true,
        withdrawal: {
          id: existing.id,
          userId: existing.userId,
          amount: existing.amount,
          fee: existing.fee,
          currency: existing.currency,
          method: existing.method,
          status: existing.status,
          agentId: existing.agentId,
          createdAt: existing.createdAt,
        },
        transaction: transaction ? { id: transaction.id, status: transaction.status, createdAt: transaction.createdAt } : null,
        updatedBalances: balances,
        dailyLimits,
      });
    };

    if (existingWithdrawal) return responseForExisting(existingWithdrawal);

    // Rate limit only new operations; retries with the same idempotency key return
    // their original pending request without consuming another allowance.
    const rateLimit = checkRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3, key: `withdraw:${userId}` });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetIn);

    const [agent, foundAgent] = await Promise.all([
      findActiveAgentByIdentifier(agentCodeInput),
      findAgentByIdentifier(agentCodeInput),
    ]);

    if (!agent) {
      if (foundAgent?.suspended) {
        return NextResponse.json({ success: false, message: 'Cet agent est suspendu. Choisissez un autre agent.' }, { status: 403 });
      }
      if (foundAgent && foundAgent.validationStatus !== 'validated') {
        return NextResponse.json({ success: false, message: "Cet agent n'est pas encore validé. Choisissez un agent validé." }, { status: 403 });
      }
      return NextResponse.json({ success: false, message: 'Agent non trouvé. Vérifiez le code agent ou son numéro de téléphone.' }, { status: 404 });
    }

    if (agent.id === userId) {
      return NextResponse.json({ success: false, message: 'Vous ne pouvez pas valider votre propre retrait comme agent.' }, { status: 400 });
    }

    const policy = await getFinancialPolicy();
    const exchangeRate = await getUsdCdfExchangeRate();

    // Referred accounts share a USD-equivalent lifetime withdrawal cap.
    if (user.referredBy) {
      const userWithdrawals = await db.withdrawal.findMany({
        where: { userId, status: { in: ['completed', 'pending'] } },
        select: { amount: true, currency: true },
      });
      const totalWithdrawnUSD = userWithdrawals.reduce((total, withdrawal) => (
        total + (normalizeCurrency(withdrawal.currency) === 'USD' ? withdrawal.amount : withdrawal.amount / exchangeRate)
      ), 0);
      const currentWithdrawalUSD = cur === 'USD' ? amount : amount / exchangeRate;
      if (totalWithdrawnUSD + currentWithdrawalUSD > 100) {
        return NextResponse.json({
          success: false,
          message: `Limite de retrait dépassée. Plafond total : 100,00 USD. Déjà demandé/en cours : ${totalWithdrawnUSD.toFixed(2)} USD.`,
        }, { status: 400 });
      }
    }

    const fee = calculateCurrencyFee(amount, policy.withdrawalFeeBasisPoints, cur);
    const cashField = cur === 'CDF' ? 'realBalanceFC' : 'realBalance';
    const bonusField = cur === 'CDF' ? 'bonusBalanceFC' : 'bonusBalance';
    const agentName = agent.agentCode || agent.agentNumber || agent.name || 'TRAIT';
    const agentCodeDisplay = agent.agentCode || agent.agentNumber || 'N/A';
    const formattedAmount = formatAmount(amount, cur);
    const description = `Retrait de ${formattedAmount} via agent ${agentName}`;

    let result;
    try {
      result = await db.$transaction(async (tx) => {
        await lockDailyFinancialOperations(tx, userId);
        const window = getDayWindow(new Date(), policy.timezone);
        const dailyTransaction = await checkDailyTransactionLimit(tx, userId, policy, window);
        if (!dailyTransaction.allowed) throw new Error('DAILY_TRANSACTION_LIMIT');
        const dailyWithdrawal = await checkDailyWithdrawalLimit(tx, userId, amount, cur, exchangeRate, policy, window);
        if (!dailyWithdrawal.allowed) throw new Error('DAILY_WITHDRAWAL_LIMIT');

        const debitFromCash = await tx.user.updateMany({
          where: { id: userId, [cashField]: { gte: amount + fee }, suspended: false, tempBlocked: false },
          data: { [cashField]: { decrement: amount + fee } },
        });

        let feeFromBonus = false;
        let debited = debitFromCash.count === 1;
        if (!debited && fee > 0) {
          const splitDebit = await tx.user.updateMany({
            where: { id: userId, [cashField]: { gte: amount }, [bonusField]: { gte: fee }, suspended: false, tempBlocked: false },
            data: { [cashField]: { decrement: amount }, [bonusField]: { decrement: fee } },
          });
          debited = splitDebit.count === 1;
          feeFromBonus = debited;
        }
        if (!debited) throw new Error('INSUFFICIENT_BALANCE');

        const withdrawal = await (tx.withdrawal as any).create({
          data: {
            userId,
            amount,
            fee,
            feeFromBonus,
            currency: cur,
            method: 'agent',
            status: 'pending',
            agentId: agent.id,
            ...(requestId ? { clientRequestId: requestId, requestFingerprint } : {}),
          },
        });
        const transaction = await tx.transaction.create({
          data: {
            type: 'withdrawal',
            amount,
            fee,
            currency: cur,
            status: 'pending',
            senderId: userId,
            receiverId: agent.id,
            agentId: agent.id,
            description,
            ...(requestId ? { clientRequestId: requestId, requestFingerprint } : {}),
          },
        });
        await tx.notification.createMany({
          data: [
            {
              userId,
              title: 'Retrait en cours de validation',
              message: `Votre retrait de ${formattedAmount} (frais : ${formatAmount(fee, cur)}) via ${agentName} attend la validation de l’agent.`,
              type: 'withdrawal_validated',
            },
            {
              userId: agent.id,
              title: 'Nouveau retrait à valider',
              message: `Le client ${user.name || user.pseudo || user.phone} demande ${formattedAmount}. Code : ${agentCodeDisplay}`,
              type: 'general',
            },
          ],
        });
        return { withdrawal, transaction };
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'DAILY_TRANSACTION_LIMIT') {
        return NextResponse.json({ success: false, code: 'DAILY_TRANSACTION_LIMIT', message: `Limite journalière atteinte (${policy.dailyTransactionLimit} opérations).` }, { status: 429 });
      }
      if (error instanceof Error && error.message === 'DAILY_WITHDRAWAL_LIMIT') {
        return NextResponse.json({ success: false, code: 'DAILY_WITHDRAWAL_LIMIT', message: 'Le plafond de retrait quotidien est atteint dans l’équivalent USD/CDF.' }, { status: 429 });
      }
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({ success: false, message: `Solde ${cur} insuffisant pour couvrir le retrait et les frais.` }, { status: 400 });
      }
      if (requestId && typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        const racedWithdrawal = await (db.withdrawal as any).findUnique({
          where: { userId_clientRequestId: { userId, clientRequestId: requestId } },
          include: { agent: { select: { id: true, agentCode: true, agentNumber: true, name: true } } },
        });
        if (racedWithdrawal) return responseForExisting(racedWithdrawal);
      }
      throw error;
    }

    const { withdrawal, transaction } = result;

    try {
      const { sendPushToUser } = await import('@/lib/push');
      await sendPushToUser(agent.id, {
        title: 'Nouveau retrait à valider',
        body: `${user.name || user.pseudo || user.phone} demande ${formattedAmount}. Validez dans l’app.`,
        url: '/agent-withdraw-validate',
      });
    } catch {
      // The withdrawal is already committed; push delivery is best effort.
    }

    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true },
    });

    const dailyLimits = await getUserDailyLimits(userId).catch(() => null);
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
      transaction: { id: transaction.id, status: transaction.status, createdAt: transaction.createdAt },
      updatedBalances: updatedUser,
      dailyLimits,
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
