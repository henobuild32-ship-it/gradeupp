import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logSecurityEvent } from '@/lib/security';
import { requireUser, verifyAndMigratePin, verifyAndMigratePassword } from '@/lib/auth';
import { createNotification, updateBalanceAndNotify } from '@/lib/notifications';
import { safeDeduct } from '@/lib/balance';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const { parentId, childId, amount, currency, pinOrPassword } = body as {
      parentId: string;
      childId: string;
      amount: number;
      currency: 'USD' | 'FC';
      pinOrPassword?: string;
    };

    if (!parentId || !childId || !amount || amount <= 0 || !currency) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants ou invalides' },
        { status: 400 }
      );
    }

    if (auth.userId !== parentId) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      );
    }

    if (!pinOrPassword) {
      return NextResponse.json(
        { success: false, message: 'PIN ou mot de passe de confirmation requis' },
        { status: 400 }
      );
    }

    // Verify parent
    const parent = await db.user.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      return NextResponse.json(
        { success: false, message: 'Parent non trouvé' },
        { status: 404 }
      );
    }

    // Authenticate parent (accept PIN or Password)
    const isAuthentic = 
      await verifyAndMigratePin(parent.id, pinOrPassword, parent.pin) || 
      await verifyAndMigratePassword(parent.id, pinOrPassword, parent.password);

    if (!isAuthentic) {
      return NextResponse.json(
        { success: false, message: 'PIN ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Verify child
    const child = await db.user.findUnique({
      where: { id: childId },
    });

    if (!child || child.parentId !== parentId) {
      return NextResponse.json(
        { success: false, message: 'Compte enfant non trouvé ou non lié à ce parent' },
        { status: 404 }
      );
    }

    const isFC = currency === 'FC';
    const limitMax = isFC ? 10000000 : 1000;
    const currentChildBal = isFC ? child.realBalanceFC : child.realBalance;

    // Enforce child balance limits
    if (currentChildBal + amount > limitMax) {
      return NextResponse.json(
        {
          success: false,
          message: `Dépassement de la limite autorisé pour ce compte enfant. Solde max : ${limitMax.toLocaleString('fr-FR')} ${currency}. Solde actuel: ${currentChildBal.toFixed(2)} ${currency}.`,
        },
        { status: 400 }
      );
    }

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeduct(parentId, amount, currency);
    if (!deductResult.success) {
      return NextResponse.json(
        { success: false, message: deductResult.message },
        { status: 400 }
      );
    }

    // Perform transaction
    const [updatedChild, transaction] = await db.$transaction([
      db.user.update({
        where: { id: childId },
        data: isFC
          ? { realBalanceFC: { increment: amount } }
          : { realBalance: { increment: amount } },
      }),
      db.transaction.create({
        data: {
          type: 'child_recharge',
          amount,
          fee: 0,
          currency,
          status: 'completed',
          senderId: parentId,
          receiverId: childId,
          description: `Recharge de la carte de ${child.name || 'enfant'}`,
        },
      }),
    ]);

    // Log the recharge activity
    await logSecurityEvent({
      userId: parentId,
      action: 'child_card_recharged',
      details: JSON.stringify({
        childId,
        childName: child.name,
        amount,
        currency,
        transactionId: transaction.id,
      }),
      riskLevel: 'low',
    });

    await createNotification(parentId, 'Recharge Enfant effectuée', `Vous avez rechargé la carte de ${child.name} de ${amount.toFixed(2)} ${currency}.`, 'general', true)

    await createNotification(childId, 'Carte rechargée', `Votre parent a rechargé votre carte TRAIT de ${amount.toFixed(2)} ${currency}.`, 'general', true)

    // Fetch updated parent balance for response
    const updatedParent = await db.user.findUnique({
      where: { id: parentId },
      select: { realBalance: true, realBalanceFC: true },
    });

    // Emit balance updates in real-time
    if (updatedParent) {
      await updateBalanceAndNotify(parentId, updatedParent.realBalance, updatedParent.realBalanceFC)
    }
    await updateBalanceAndNotify(childId, updatedChild.realBalance, updatedChild.realBalanceFC)

    return NextResponse.json({
      success: true,
      message: `Recharge de ${amount.toFixed(2)} ${currency} effectuée avec succès pour ${child.name}.`,
      parentBalances: updatedParent ? {
        realBalance: updatedParent.realBalance,
        realBalanceFC: updatedParent.realBalanceFC,
      } : null,
      childBalances: {
        realBalance: updatedChild.realBalance,
        realBalanceFC: updatedChild.realBalanceFC,
      },
      transaction,
    });
  } catch (error) {
    console.error('Child card recharge error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la recharge de la carte enfant' },
      { status: 500 }
    );
  }
}
