import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency } = body;

    const validAmount = parseFloat(amount) || 2500;
    const validCurrency = currency === 'CDF' || currency === 'FC' ? 'CDF' : currency === 'USD' ? 'USD' : 'CDF';

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const paymentId = `pay_test_${crypto.randomBytes(12).toString('hex')}`;
    const success = Math.random() > 0.2; // 80% success rate

    const result = {
      success,
      payment: {
        id: paymentId,
        amount: validAmount,
        currency: validCurrency,
        status: success ? 'completed' : 'failed',
        description: 'Paiement test sandbox',
        customer: { email: 'test@email.com' },
        fee: Math.round(validAmount * 0.015 * 100) / 100,
        commission: Math.round(validAmount * 0.015 * 100) / 100,
        timestamp: new Date().toISOString(),
      },
      message: success
        ? `Paiement de ${validAmount} ${validCurrency} réussi (commission 1,5% : ${Math.round(validAmount * 0.015 * 100) / 100} ${validCurrency})`
        : 'Transaction échouée (carte insuffisante)',
      environment: 'sandbox',
      apiVersion: 'v2.0',
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test payment error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors du test' },
      { status: 500 }
    );
  }
}
