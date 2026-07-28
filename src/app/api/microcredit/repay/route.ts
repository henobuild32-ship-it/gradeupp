import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { safeDeduct } from '@/lib/balance'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { creditId, amount } = body

    if (!creditId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'ID de crédit et montant requis' }, { status: 400 })
    }

    const credit = await prisma.microCredit.findUnique({
      where: { id: creditId },
    })

    if (!credit) {
      return NextResponse.json({ success: false, message: 'Crédit introuvable' }, { status: 404 })
    }

    if (credit.userId !== auth.userId) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 })
    }

    if (credit.status !== 'approved' && credit.status !== 'active' && credit.status !== 'overdue') {
      return NextResponse.json({ success: false, message: 'Ce crédit ne peut pas être remboursé' }, { status: 400 })
    }

    const remainingDue = credit.totalDue - credit.paidSoFar
    const payAmount = Math.min(amount, remainingDue)

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeduct(auth.userId, payAmount, credit.currency)
    if (!deductResult.success) {
      return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Update credit record
      const newPaidSoFar = credit.paidSoFar + payAmount
      const isFullyPaid = newPaidSoFar >= credit.totalDue

      await tx.microCredit.update({
        where: { id: creditId },
        data: {
          paidSoFar: newPaidSoFar,
          status: isFullyPaid ? 'repaid' : credit.status,
          completedAt: isFullyPaid ? new Date() : null,
        },
      })

      // Create transaction log
      await tx.transaction.create({
        data: {
          type: 'microcredit_repay',
          amount: payAmount,
          currency: credit.currency,
          status: 'completed',
          senderId: auth.userId,
          receiverId: auth.userId,
          description: `Remboursement de micro-crédit (${credit.currency})`,
        },
      })

      // Send notification
      await tx.notification.create({
        data: {
          userId: auth.userId,
          title: 'Remboursement de crédit',
          message: `Vous avez remboursé ${payAmount.toFixed(2)} ${credit.currency} pour votre micro-crédit.`,
          type: 'payment',
        },
      })
    })

    return NextResponse.json({ success: true, message: 'Remboursement effectué avec succès' })
  } catch (error) {
    console.error('Microcredit repay error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
