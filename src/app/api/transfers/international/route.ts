import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkDailyLimit, checkKYC, detectSuspiciousActivity, logSecurityEvent } from '@/lib/security';
import { requireUser } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { safeDeductWithFee } from '@/lib/balance';

const FEE_RATES: Record<string, number> = {
  wallet: 0.005,
  mobile_money: 0.01,
  bank: 0.015,
  card: 0.02,
  merchant: 0.01,
  qr_code: 0.005,
};

const COMMISSION_RATE = 0.015;
const VALID_TYPES = ['wallet', 'mobile_money', 'bank', 'card', 'merchant', 'qr_code'];

const REQUIRED_FIELDS: Record<string, string[]> = {
  wallet: ['recipientPhone', 'recipientName', 'country', 'currency', 'amount'],
  mobile_money: ['recipientPhone', 'recipientName', 'country', 'currency', 'amount'],
  bank: ['recipientName', 'recipientAccount', 'recipientBank', 'country', 'currency', 'amount'],
  card: ['recipientName', 'country', 'currency', 'amount'],
  merchant: ['recipientName', 'country', 'currency', 'amount'],
  qr_code: ['recipientName', 'country', 'currency', 'amount'],
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    // Rate limit: 5 transfers per hour per user
    const rateLimit = checkRateLimit({
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
      key: `intl:${auth.userId}`,
    })
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn)
    }

    const userId = auth.userId
    const body = await request.json();
    const {
      type: rawType,
      recipientName,
      recipientPhone,
      recipientAccount,
      recipientBank,
      swiftBic,
      iban,
      country,
      currency,
      amount,
      description,
    } = body;

    const type = String(rawType || '')
      .replace('mobile-money', 'mobile_money')
      .replace('qrcode', 'qr_code');

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, message: `Type de transfert invalide. Types valides: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const required = REQUIRED_FIELDS[type] || [];
    const missingFields: string[] = [];
    for (const field of required) {
      const value = body[field];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, message: `Champs requis manquants pour le type ${type}: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Le montant doit être un nombre positif' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, realBalance: true, realBalanceFC: true, suspended: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
    }

    if (user.suspended) {
      await logSecurityEvent({
        userId, action: 'transfer_blocked',
        details: JSON.stringify({ reason: 'account_suspended', amount: transferAmount, type }),
        riskLevel: 'high',
      });
      return NextResponse.json({ success: false, message: 'Votre compte est suspendu.' }, { status: 403 });
    }

    const kycResult = await checkKYC(userId);
    if (!kycResult.verified) {
      await logSecurityEvent({
        userId, action: 'transfer_blocked',
        details: JSON.stringify({ reason: 'kyc_not_verified', kycStatus: kycResult.status, amount: transferAmount, type }),
        riskLevel: 'medium',
      });
      return NextResponse.json({
        success: false, message: 'Vérification KYC requise', code: 'KYC_REQUIRED',
        kycStatus: kycResult.status, kycRejectReason: kycResult.rejectReason,
      }, { status: 403 });
    }

    const dailyCheck = await checkDailyLimit(userId);
    if (!dailyCheck.allowed) {
      await logSecurityEvent({
        userId, action: 'daily_limit_reached',
        details: JSON.stringify({ count: dailyCheck.count, limit: dailyCheck.limit, amount: transferAmount, type }),
        riskLevel: 'high',
      });
      return NextResponse.json({
        success: false, message: `Limite journalière atteinte (${dailyCheck.limit} transactions/jour).`,
        code: 'DAILY_LIMIT_REACHED', dailyTransactions: dailyCheck.count, dailyLimit: dailyCheck.limit,
      }, { status: 429 });
    }

    const suspicious = await detectSuspiciousActivity(userId, transferAmount);
    if (suspicious.suspicious) {
      await logSecurityEvent({
        userId, action: 'suspicious_activity',
        details: JSON.stringify({ reasons: suspicious.reasons, amount: transferAmount, type }),
        riskLevel: suspicious.reasons.length >= 2 ? 'critical' : 'medium',
      });
      if (suspicious.reasons.length >= 2) {
        return NextResponse.json({
          success: false, message: 'Activité suspecte détectée. Contactez le support.',
          code: 'SUSPICIOUS_ACTIVITY',
        }, { status: 403 });
      }
    }

    const feeRate = FEE_RATES[type] || 0.01;
    const fee = Math.round(transferAmount * feeRate * 100) / 100;
    const commission = Math.round(transferAmount * COMMISSION_RATE * 100) / 100;

    const isFC = currency === 'FC';

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeductWithFee(userId, transferAmount, fee + commission, currency);
    if (!deductResult.success) {
      return NextResponse.json({
        success: false,
        message: deductResult.message,
      }, { status: 400 });
    }

    let exchangeRate: number | null = null;
    let amountReceived = transferAmount - fee - commission;
    amountReceived = Math.max(0, amountReceived);

    // Fetch dynamic exchange rate
    const rateConfig = await db.systemConfig.findUnique({
      where: { key: 'exchange_rate_usd_fc' },
    });
    exchangeRate = rateConfig ? parseFloat(rateConfig.value) : 2850;

    // Create records
    const totalDeduction = fee + commission;

    const [transfer] = await db.$transaction([
      db.internationalTransfer.create({
        data: {
          userId,
          type,
          recipientName,
          recipientPhone: recipientPhone || null,
          recipientAccount: recipientAccount || null,
          recipientBank: recipientBank || null,
          swiftBic: swiftBic || null,
          iban: iban || null,
          country,
          currency,
          amount: transferAmount,
          fee,
          commission,
          exchangeRate,
          amountReceived,
          status: 'processing',
          description: description || null,
        },
      }),
      db.transaction.create({
        data: {
          type: 'international_transfer',
          amount: transferAmount,
          fee: fee + commission,
          currency,
          status: 'processing',
          senderId: userId,
          receiverId: userId,
          description: `Transfert international ${type} vers ${recipientName}`,
        },
      }),
      db.notification.create({
        data: {
          userId,
          title: 'Transfert international initié',
          message: `Votre transfert de ${transferAmount.toFixed(2)} ${currency} vers ${recipientName} est en cours de traitement.`,
          type: 'transfer_sent',
        },
      }),
    ]);

    // Send push notification
    try {
      const { sendPushToUser } = await import('@/lib/push');
      await sendPushToUser(userId, {
        title: 'Transfert international initié',
        body: `Votre transfert de ${transferAmount.toFixed(2)} ${currency} vers ${recipientName} est en cours.`,
        url: '/history',
      });
    } catch {}

    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Transfert international créé avec succès',
      transfer: {
        id: transfer.id,
        type: transfer.type,
        recipientName: transfer.recipientName,
        country: transfer.country,
        currency: transfer.currency,
        amount: transfer.amount,
        fee: transfer.fee,
        commission: transfer.commission,
        amountReceived: transfer.amountReceived,
        status: transfer.status,
        createdAt: transfer.createdAt,
      },
      summary: {
        amountSent: transferAmount, fee, commission, totalDeduction,
        amountReceived,
      },
      updatedBalances: updatedUser,
    });
  } catch (error) {
    console.error('International transfer error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const userId = auth.userId

    const transfers = await db.internationalTransfer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, transfers });
  } catch (error) {
    console.error('International transfers list error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
