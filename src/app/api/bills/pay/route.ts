import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { safeDeduct } from '@/lib/balance'

const billerToType: Record<string, string> = {
  snel: 'electricity',
  regideso: 'water',
  internet: 'internet',
  ecole: 'subscription',
}

const typeLabels: Record<string, string> = {
  electricity: 'SNEL (Électricité)',
  water: 'REGIDESO (Eau)',
  internet: 'Internet',
  subscription: 'École / Frais scolaires',
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { billerId, fields, amount, currency } = body

    if (!billerId || !amount || amount <= 0 || !fields) {
      return NextResponse.json({ success: false, message: 'Tous les champs requis ne sont pas fournis' }, { status: 400 })
    }

    const billType = billerToType[billerId] || 'other'
    const reference = (fields.contractNumber || fields.studentId || fields.meterNumber || 'REF-' + Math.random().toString(36).substring(7).toUpperCase()).trim()
    const cur = currency || 'USD'

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeduct(auth.userId, parseFloat(amount), cur)
    if (!deductResult.success) {
      return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create bill payment record
      const billPayment = await tx.billPayment.create({
        data: {
          userId: auth.userId,
          billType,
          reference,
          amount: parseFloat(amount),
          currency: cur,
          status: 'completed',
        },
      })

      // Create transaction record
      await tx.transaction.create({
        data: {
          type: 'bill_payment',
          amount: parseFloat(amount),
          fee: 0,
          currency: cur,
          status: 'completed',
          senderId: auth.userId,
          receiverId: auth.userId,
          description: `Paiement facture ${typeLabels[billType] || billType} (Réf: ${reference})`,
        },
      })

      // Create notification record
      await tx.notification.create({
        data: {
          userId: auth.userId,
          title: 'Paiement de facture',
          message: `Vous avez payé ${parseFloat(amount).toFixed(2)} ${cur} pour ${typeLabels[billType] || billType} (Réf: ${reference})`,
          type: 'purchase',
        },
      })

      return billPayment
    })

    return NextResponse.json({
      success: true,
      reference: result.reference,
      billPayment: result,
    }, { status: 201 })
  } catch (error) {
    console.error('Bills payment POST error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
