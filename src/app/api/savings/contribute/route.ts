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
    const { goalId, amount } = body

    if (!goalId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'ID objectif et montant requis' }, { status: 400 })
    }

    const goal = await prisma.savingsGoal.findUnique({ where: { id: goalId } })
    if (!goal) {
      return NextResponse.json({ success: false, message: 'Objectif d\'épargne introuvable' }, { status: 404 })
    }

    if (goal.userId !== auth.userId) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 })
    }

    if (goal.status !== 'active') {
      return NextResponse.json({ success: false, message: 'Cet objectif d\'épargne n\'est plus actif' }, { status: 400 })
    }

    const parseAmount = parseFloat(amount)

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeduct(auth.userId, parseAmount, goal.currency)
    if (!deductResult.success) {
      return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 })
    }

    const newAmount = goal.currentAmount + parseAmount
    const isCompleted = newAmount >= goal.targetAmount

    await prisma.$transaction([
      prisma.savingsContribution.create({
        data: {
          goalId,
          amount: parseAmount,
          currency: goal.currency,
          type: 'manual',
        },
      }),
      prisma.savingsGoal.update({
        where: { id: goalId },
        data: {
          currentAmount: { increment: parseAmount },
          ...(isCompleted ? { status: 'completed', completedAt: new Date() } : {}),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: isCompleted ? 'Objectif d\'épargne atteint ! Félicitations !' : 'Contribution ajoutée avec succès',
      goal: {
        ...goal,
        currentAmount: newAmount,
        status: isCompleted ? 'completed' : 'active',
      },
    })
  } catch (error) {
    console.error('Savings contribute POST error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
