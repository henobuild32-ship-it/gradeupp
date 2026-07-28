import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { safeDeduct } from '@/lib/balance'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const link = await prisma.paymentLink.findUnique({
      where: { code },
      include: { user: { select: { id: true, name: true, pseudo: true } } },
    })

    if (!link) {
      return NextResponse.json({ success: false, message: 'Lien de paiement introuvable' }, { status: 404 })
    }

    if (link.status !== 'active') {
      return NextResponse.json({ success: false, message: 'Ce lien de paiement n\'est plus actif' }, { status: 404 })
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      return NextResponse.json({ success: false, message: 'Ce lien de paiement a expiré' }, { status: 404 })
    }

    if (link.maxUses > 0 && link.useCount >= link.maxUses) {
      return NextResponse.json({ success: false, message: 'Ce lien de paiement a atteint le nombre maximal d\'utilisations' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      link: {
        amount: link.amount,
        currency: link.currency,
        description: link.description,
        status: link.status,
        allowedMethods: link.allowedMethods || 'wallet,mpesa,orange,airtel,afrimoney',
        owner: link.user,
      },
    })
  } catch (error) {
    console.error('Payment link GET error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const body = await request.json().catch(() => ({}))
    const method = (body as any).method as string | undefined
    const mobileNumber = (body as any).mobileNumber as string | undefined

    const link = await prisma.paymentLink.findUnique({
      where: { code },
      include: { user: { select: { id: true, name: true } } },
    })

    if (!link) {
      return NextResponse.json({ success: false, message: 'Lien de paiement introuvable' }, { status: 404 })
    }

    if (link.status !== 'active') {
      return NextResponse.json({ success: false, message: 'Ce lien de paiement n\'est plus actif' }, { status: 400 })
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      await prisma.paymentLink.update({ where: { id: link.id }, data: { status: 'expired' } })
      return NextResponse.json({ success: false, message: 'Ce lien de paiement a expiré' }, { status: 400 })
    }

    if (link.maxUses > 0 && link.useCount >= link.maxUses) {
      return NextResponse.json({ success: false, message: 'Ce lien de paiement a atteint le nombre maximal d\'utilisations' }, { status: 400 })
    }

    // ── Mobile Money payment (no auth required) ──
    if (method && method !== 'wallet') {
      if (!mobileNumber?.trim()) {
        return NextResponse.json({ success: false, message: 'Numéro de téléphone requis' }, { status: 400 })
      }

      // Log the mobile money payment request
      const txDescription = `Paiement ${method.toUpperCase()} (${mobileNumber.trim()}) via lien ${link.code}`
      await prisma.$transaction([
        prisma.transaction.create({
          data: {
            type: 'payment_link',
            amount: link.amount,
            fee: 0,
            currency: link.currency,
            status: 'pending', // pending until mobile money confirms
            senderId: link.userId, // placeholder sender = owner
            receiverId: link.userId,
            description: txDescription,
          },
        }),
        prisma.paymentLink.update({
          where: { id: link.id },
          data: { useCount: { increment: 1 } },
        }),
      ])

      return NextResponse.json({
        success: true,
        method,
        message: `Demande de paiement ${method} soumise. Le destinataire recevra les fonds après confirmation de l'opérateur.`,
      })
    }

    // ── TRAIT Wallet payment (requires auth) ──
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Connectez-vous pour payer via Wallet TRAIT' }, { status: 401 })
    }

    if (link.userId === auth.userId) {
      return NextResponse.json({ success: false, message: 'Vous ne pouvez pas payer votre propre lien' }, { status: 400 })
    }

    const isFC = link.currency === 'FC'

    // Atomic balance check + deduction (race-condition safe)
    const deductResult = await safeDeduct(auth.userId, link.amount, link.currency)
    if (!deductResult.success) {
      return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 })
    }

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          type: 'payment_link',
          amount: link.amount,
          fee: 0,
          currency: link.currency,
          status: 'completed',
          senderId: auth.userId,
          receiverId: link.userId,
          description: `Paiement via lien ${link.code}`,
        },
      }),
      prisma.user.update({ where: { id: link.userId }, data: isFC ? { realBalanceFC: { increment: link.amount } } : { realBalance: { increment: link.amount } } }),
      prisma.paymentLink.update({ where: { id: link.id }, data: { useCount: { increment: 1 } } }),
    ])

    // Push notification to link owner
    try {
      const { sendPushToUser } = await import('@/lib/push')
      await sendPushToUser(link.userId, {
        title: 'Paiement reçu !',
        body: `${payer.name || payer.phone} vous a payé ${link.amount.toFixed(2)} ${link.currency} via votre lien.`,
        url: '/history',
      })
    } catch {}

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    })
  } catch (error) {
    console.error('Payment link POST error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
