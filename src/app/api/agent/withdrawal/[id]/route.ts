import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { findAgentByIdentifier, findActiveAgentByIdentifier } from '@/lib/agents'
import { requireUser } from '@/lib/auth'
import { formatAmount } from '@/lib/tx-labels'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const { userId, amount, currency, method, agentCode } = body as {
      userId: string
      amount: number
      currency: string
      method: string
      agentCode?: string
    }

    if (!userId || typeof amount !== 'number' || amount <= 0) {
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

    const code = (agentCode || '').trim()
    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Code agent requis' },
        { status: 400 }
      )
    }

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

    const found = await findAgentByIdentifier(code)
    if (!found) {
      return NextResponse.json(
        { success: false, message: 'Agent non trouvé. Vérifiez le code agent.' },
        { status: 404 }
      )
    }

    if (found.suspended) {
      return NextResponse.json(
        { success: false, message: 'Cet agent est suspendu.' },
        { status: 403 }
      )
    }

    if (found.validationStatus !== 'validated') {
      return NextResponse.json(
        { success: false, message: 'Cet agent n\'est pas encore validé.' },
        { status: 403 }
      )
    }

    if (found.id === userId) {
      return NextResponse.json(
        { success: false, message: 'Vous ne pouvez pas retirer via votre propre code agent' },
        { status: 400 }
      )
    }

    const agent = await findActiveAgentByIdentifier(code)
    if (!agent) {
      return NextResponse.json(
        { success: false, message: 'Agent non actif. Vérifiez le code agent.' },
        { status: 403 }
      )
    }

    const cur = currency === 'FC' ? 'FC' : 'USD'
    // Frais calculés côté serveur (0.7%) — jamais depuis le client
    const feeAmount = Math.round(amount * 0.007 * 100) / 100
    const amountLabel = formatAmount(amount, cur)
    const agentLabel = agent.agentCode || agent.agentNumber || agent.name || 'agent'
    const description = `Retrait de ${amountLabel} via agent ${agentLabel}`

    const deductResult = await (await import('@/lib/balance')).safeDeductWithFee(userId, amount, feeAmount, cur)
    if (!deductResult.success) {
      return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 })
    }

    const withdrawal = await db.withdrawal.create({
      data: {
        userId,
        amount,
        fee: feeAmount,
        currency: cur,
        method: method || 'agent',
        status: 'pending',
        agentId: agent.id,
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
        receiverId: agent.id,
        agentId: agent.id,
        description,
      },
    })

    await db.notification.create({
      data: {
        userId,
        title: 'Retrait en cours',
        message: `Votre demande de retrait de ${amountLabel} (frais: ${formatAmount(feeAmount, cur)}) via l'agent ${agentLabel} est en attente de validation.`,
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
