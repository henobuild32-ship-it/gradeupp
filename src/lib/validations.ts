import { z } from 'zod'

export const SendMoneySchema = z.object({
  receiverPhone: z.string().min(8).max(20),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'FC']),
  pin: z.string().min(4).max(6).optional(),
  description: z.string().max(200).optional(),
})

export const WithdrawSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['USD', 'FC']),
  method: z.string().optional(),
  agentCode: z.string().min(1),
})

export const DepositSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['USD', 'FC']),
  method: z.string().optional(),
})

export const LoginSchema = z.object({
  phone: z.string().min(8).max(20),
  password: z.string().min(1),
})

export const RegisterSchema = z.object({
  phone: z.string().min(8).max(20),
  name: z.string().min(1).max(100),
  pseudo: z.string().min(1).max(50),
  country: z.string().min(2).max(5),
  role: z.enum(['client', 'seller', 'agent']),
  pin: z.string().min(4).max(6).optional(),
  password: z.string().min(6).max(128),
  email: z.string().email().optional(),
  gender: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  photoId: z.string().optional(),
  referralCode: z.string().optional(),
})

export const QRPaymentSchema = z.object({
  sellerId: z.string().min(1),
  qrCode: z.string().min(1),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'FC']).optional(),
  pin: z.string().min(4).max(6).optional(),
})

export const InternationalTransferSchema = z.object({
  type: z.enum(['wallet', 'mobile_money', 'bank', 'card', 'merchant', 'qr_code']),
  recipientName: z.string().min(1).max(100),
  recipientPhone: z.string().max(20).optional(),
  recipientAccount: z.string().max(50).optional(),
  recipientBank: z.string().max(100).optional(),
  swiftBic: z.string().max(20).optional(),
  iban: z.string().max(34).optional(),
  country: z.string().min(2).max(5),
  currency: z.enum(['USD', 'FC']),
  amount: z.number().positive(),
  description: z.string().max(200).optional(),
})

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data }

  const issues = result.error.issues.map((i) => i.message).join(', ')
  return { success: false, error: issues }
}
