import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }

    const payments = await prisma.recurringPayment.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
    })

    const recipientIds = Array.from(new Set(payments.map((p) => p.recipientId)))
    const recipients = await prisma.user.findMany({
      where: { id: { in: recipientIds }, deletedAt: null },
      // Deleted accounts may remain referenced for financial history, but their
      // private profile and phone number must not be exposed.
      select: { id: true, name: true, phone: true },
    })

    const recipientMap = new Map(recipients.map((r) => [r.id, r]))

    const mappedPayments = payments.map((p) => {
      const rec = recipientMap.get(p.recipientId)
      return {
        id: p.id,
        recipientName: rec?.name || rec?.phone || 'Utilisateur inconnu',
        recipientPhone: rec?.phone || '',
        amount: p.amount,
        currency: p.currency,
        frequency: p.frequency,
        nextRunDate: p.nextRun.toISOString(),
        status: p.status,
        description: p.description || '',
        createdAt: p.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ success: true, payments: mappedPayments })
  } catch (error) {
    console.error('Recurring payments GET error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const recipientPhone = body.recipientPhone
    const amount = body.amount
    const currency = body.currency
    const frequency = body.frequency
    const description = body.description
    const nextRunInput = body.nextRun || body.startDate

    if (!recipientPhone || !amount || !nextRunInput) {
      return NextResponse.json({ success: false, message: 'Téléphone destinataire, montant et date de début requis' }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ success: false, message: 'Montant invalide' }, { status: 400 })
    }

    const nextRunDate = new Date(nextRunInput)
    if (isNaN(nextRunDate.getTime())) {
      return NextResponse.json({ success: false, message: 'Date invalide' }, { status: 400 })
    }

    const recipient = await prisma.user.findUnique({ where: { phone: recipientPhone, deletedAt: null } })
    if (!recipient) {
      return NextResponse.json({ success: false, message: 'Destinataire non trouvé' }, { status: 404 })
    }

    const recurring = await prisma.recurringPayment.create({
      data: {
        userId: auth.userId,
        recipientId: recipient.id,
        amount: parseFloat(amount),
        currency: currency || 'FC',
        frequency: frequency || 'monthly',
        description: description || null,
        nextRun: nextRunDate,
      },
    })

    return NextResponse.json({ success: true, payment: recurring }, { status: 201 })
  } catch (error) {
    console.error('Recurring payments POST error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
