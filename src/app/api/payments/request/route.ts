import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }

    const requesterUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { phone: true },
    })

    if (!requesterUser) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Fetch requests where user is either requester or recipient
    const sent = await prisma.paymentRequest.findMany({
      where: { requesterId: auth.userId },
      include: {
        requester: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const received = await prisma.paymentRequest.findMany({
      where: { targetPhone: requesterUser.phone },
      include: {
        requester: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Gather all target phones to fetch recipient profiles
    const targetPhones = Array.from(
      new Set([
        ...sent.map((r) => r.targetPhone).filter(Boolean),
        ...received.map((r) => r.targetPhone).filter(Boolean),
      ])
    ) as string[]

    const targetUsers = await prisma.user.findMany({
      where: { phone: { in: targetPhones } },
      select: { id: true, name: true, phone: true },
    })

    const userMap = new Map(targetUsers.map((u) => [u.phone, u]))

    const mapRequest = (r: any) => {
      const recipientProfile = userMap.get(r.targetPhone || '') || {
        id: r.targetId || '',
        name: 'Utilisateur inconnu',
        phone: r.targetPhone || '',
      }

      return {
        id: r.id,
        amount: r.amount,
        currency: r.currency,
        description: r.description || '',
        status: r.status === 'completed' ? 'accepted' : r.status,
        createdAt: r.createdAt.toISOString(),
        requester: {
          id: r.requester.id,
          name: r.requester.name || 'Utilisateur inconnu',
          phone: r.requester.phone,
        },
        recipient: {
          id: recipientProfile.id,
          name: recipientProfile.name || 'Utilisateur inconnu',
          phone: recipientProfile.phone,
        },
      }
    }

    const mappedSent = sent.map(mapRequest)
    const mappedReceived = received.map(mapRequest)

    // Combine and sort
    const allMapped = [...mappedSent, ...mappedReceived]
    const uniqueMap = new Map()
    for (const item of allMapped) {
      uniqueMap.set(item.id, item)
    }

    const sortedRequests = Array.from(uniqueMap.values()).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ success: true, requests: sortedRequests })
  } catch (error) {
    console.error('Payment requests GET error:', error)
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
    const targetPhone = body.targetPhone || body.recipientPhone
    const { amount, currency, description } = body

    if (!targetPhone || !amount) {
      return NextResponse.json({ success: false, message: 'Téléphone destinataire et montant requis' }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ success: false, message: 'Montant invalide' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { phone: targetPhone } })
    if (!target) {
      return NextResponse.json({ success: false, message: 'Destinataire non trouvé' }, { status: 404 })
    }

    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        requesterId: auth.userId,
        targetId: target.id,
        targetPhone,
        amount: parseFloat(amount),
        currency: currency || 'FC',
        description: description || null,
      },
    })

    return NextResponse.json({ success: true, request: paymentRequest }, { status: 201 })
  } catch (error) {
    console.error('Payment requests POST error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
