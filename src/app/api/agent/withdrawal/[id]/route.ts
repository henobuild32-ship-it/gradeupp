import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { findActiveAgentByIdentifier } from '@/lib/agents'
import { requireUser } from '@/lib/auth'
import { safeDeductWithFee } from '@/lib/balance'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const { userId, amount, fee, currency, method, agentCode } = body as {
      userId: string
      amount: number
      fee: number
      currency: string
      method: string
      agentCode?: string
    }

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'User ID and positive amount are required' },
        { status: 400 }
      )
    }

    if (auth.userId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    if (user.tempBlocked) {
      return NextResponse.json({ success: false, message: 'Votre compte est temporairement bloqué.' }, { status: 403 })
    }

    if (user.suspended) {
      return NextResponse.json({ success: false, message: 'Votre compte est suspendu.' }, { status: 403 })
    }

    const cur = currency || 'USD'
    const feeAmount = fee || 0
    const totalDeduction = amount + feeAmount

    // Check and deduct balance atomically (race-condition safe)
    const deductResult = await safeDeductWithFee(userId, amount, feeAmount, cur)
    if (!deductResult.success) {
      return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 })
    }

    // Resolve agentId from agentCode if provided
    let linkedAgentId: string | undefined
    if (agentCode) {
      const agent = await findActiveAgentByIdentifier(agentCode)
      if (agent) linkedAgentId = agent.id
    }

    // Create withdrawal and transaction records
    const withdrawal = await db.withdrawal.create({
      data: {
        userId,
        amount,
        fee: feeAmount,
        currency: cur,
        method: method || 'mobile_money',
        status: 'pending',
        agentId: linkedAgentId,
      },
    })

    await db.transaction.create({
      data: {
        type: 'withdrawal',
        amount,
        fee: feeAmount,
        currency: cur,
        status: 'pending',
        senderId: userId,
        receiverId: linkedAgentId || userId,
        agentId: linkedAgentId,
        description: `Retrait via agent ${agentCode || 'N/A'}`,
      },
    })

    await db.notification.create({
      data: {
        userId,
        title: 'Retrait en cours',
        message: `Votre demande de retrait de ${amount.toFixed(2)} ${cur} a été soumise et est en attente de validation.`,
        type: 'withdrawal_validated',
      },
    })

    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      select: { realBalance: true, realBalanceFC: true, bonusBalance: true, bonusBalanceFC: true },
    })

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
      updatedBalances: updatedUser,
    })
  } catch (error) {
    console.error('Create withdrawal error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
