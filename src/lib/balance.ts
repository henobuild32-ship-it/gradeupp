import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

export interface DeductResult {
  success: boolean;
  message: string;
}

export async function safeDeduct(
  userId: string,
  amount: number,
  currency: string = 'USD'
): Promise<DeductResult> {
  if (amount <= 0) {
    return { success: false, message: 'Montant invalide' };
  }

  const field = currency === 'FC' ? 'realBalanceFC' : 'realBalance';
  const feeField = currency === 'FC' ? 'bonusBalanceFC' : 'bonusBalance';

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { [field]: true, [feeField]: true, tempBlocked: true },
  });

  if (!user) {
    return { success: false, message: 'Utilisateur non trouvé' };
  }

  if (user.tempBlocked) {
    return { success: false, message: 'Compte temporairement bloqué' };
  }

  const balance = user[field] as number;
  const feeBalance = user[feeField] as number;

  if (balance < amount) {
    return { success: false, message: `Solde ${currency} insuffisant. Disponible: ${balance.toFixed(2)} ${currency}` };
  }

  const result = await db.user.updateMany({
    where: { id: userId, [field]: { gte: amount } },
    data: { [field]: { decrement: amount } },
  });

  if (result.count === 0) {
    return { success: false, message: 'Solde insuffisant (concurrence détectée)' };
  }

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

  const field = currency === 'FC' ? 'realBalanceFC' : 'realBalance';
  const feeField = currency === 'FC' ? 'bonusBalanceFC' : 'bonusBalance';

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { [field]: true, [feeField]: true, tempBlocked: true },
  });

  if (!user) {
    return { success: false, message: 'Utilisateur non trouvé' };
  }

  if (user.tempBlocked) {
    return { success: false, message: 'Compte temporairement bloqué' };
  }

  const balance = user[field] as number;
  const feeBalance = user[feeField] as number;
  const totalDeduction = amount + fee;

  if (balance < totalDeduction) {
    if (feeBalance >= fee && balance >= amount) {
      const result = await db.user.updateMany({
        where: { id: userId, [field]: { gte: amount } },
        data: { [field]: { decrement: amount }, [feeField]: { decrement: fee } },
      });
      if (result.count === 0) {
        return { success: false, message: 'Solde insuffisant (concurrence détectée)' };
      }
      return { success: true, message: 'Débit effectué' };
    }
    return { success: false, message: `Solde ${currency} insuffisant. Disponible: ${balance.toFixed(2)} ${currency}` };
  }

  const result = await db.user.updateMany({
    where: { id: userId, [field]: { gte: totalDeduction } },
    data: { [field]: { decrement: totalDeduction } },
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
