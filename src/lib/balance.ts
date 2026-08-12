import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

export interface DeductResult {
  success: boolean;
  message: string;
}

function getBalanceFields(currency: string) {
  const isFC = currency === 'FC';
  return {
    balanceField: isFC ? 'realBalanceFC' : 'realBalance',
    bonusField: isFC ? 'bonusBalanceFC' : 'bonusBalance',
  } as const;
}

export async function safeDeduct(
  userId: string,
  amount: number,
  currency: string = 'USD'
): Promise<DeductResult> {
  if (amount <= 0) {
    return { success: false, message: 'Montant invalide' };
  }

  const { balanceField, bonusField } = getBalanceFields(currency);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      realBalance: true,
      realBalanceFC: true,
      bonusBalance: true,
      bonusBalanceFC: true,
      tempBlocked: true,
    },
  });

  if (!user) {
    return { success: false, message: 'Utilisateur non trouvé' };
  }

  if (user.tempBlocked) {
    return { success: false, message: 'Compte temporairement bloqué' };
  }

  const balance = currency === 'FC' ? user.realBalanceFC : user.realBalance;
  const bonusBalance = currency === 'FC' ? user.bonusBalanceFC : user.bonusBalance;

  if (balance < amount) {
    return { success: false, message: `Solde ${currency} insuffisant. Disponible: ${balance.toFixed(2)} ${currency}` };
  }

  const result = await db.user.updateMany({
    where: { id: userId, [balanceField]: { gte: amount } },
    data: { [balanceField]: { decrement: amount } },
  });

  if (result.count === 0) {
    return { success: false, message: 'Solde insuffisant (concurrence détectée)' };
  }

  void bonusBalance;
  return { success: true, message: 'Débit effectué' };
}

export async function safeDeductWithFee(
  userId: string,
  amount: number,
  fee: number,
  currency: string = 'USD'
): Promise<DeductResult> {
  if (amount <= 0) {
    return { success: false, message: 'Montant invalide' };
  }

  const { balanceField, bonusField } = getBalanceFields(currency);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      realBalance: true,
      realBalanceFC: true,
      bonusBalance: true,
      bonusBalanceFC: true,
      tempBlocked: true,
    },
  });

  if (!user) {
    return { success: false, message: 'Utilisateur non trouvé' };
  }

  if (user.tempBlocked) {
    return { success: false, message: 'Compte temporairement bloqué' };
  }

  const balance = currency === 'FC' ? user.realBalanceFC : user.realBalance;
  const bonusBalance = currency === 'FC' ? user.bonusBalanceFC : user.bonusBalance;
  const totalDeduction = amount + fee;

  if (balance < totalDeduction) {
    if (bonusBalance >= fee && balance >= amount) {
      const result = await db.user.updateMany({
        where: { id: userId, [balanceField]: { gte: amount } },
        data: { [balanceField]: { decrement: amount }, [bonusField]: { decrement: fee } },
      });
      if (result.count === 0) {
        return { success: false, message: 'Solde insuffisant (concurrence détectée)' };
      }
      return { success: true, message: 'Débit effectué' };
    }
    return { success: false, message: `Solde ${currency} insuffisant. Disponible: ${balance.toFixed(2)} ${currency}` };
  }

  const result = await db.user.updateMany({
    where: { id: userId, [balanceField]: { gte: totalDeduction } },
    data: { [balanceField]: { decrement: totalDeduction } },
  });

  if (result.count === 0) {
    return { success: false, message: 'Solde insuffisant (concurrence détectée)' };
  }

  return { success: true, message: 'Débit effectué' };
}

export async function safeIncrement(
  userId: string,
  amount: number,
  currency: string = 'USD'
): Promise<DeductResult> {
  if (amount <= 0) {
    return { success: false, message: 'Montant invalide' };
  }

  const field = currency === 'FC' ? 'realBalanceFC' : 'realBalance';

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return { success: false, message: 'Utilisateur non trouvé' };
  }

  await db.user.update({
    where: { id: userId },
    data: { [field]: { increment: amount } },
  });

  return { success: true, message: 'Crédit effectué' };
}
