import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = { userId: auth.userId }
    if (status) where.status = status

    const [links, stats] = await Promise.all([
      prisma.paymentLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      // Aggregate stats
      prisma.paymentLink.aggregate({
        where: { userId: auth.userId },
        _sum: { useCount: true },
        _count: { _all: true },
      }),
    ])

    // Total collected (from completed transactions of type payment_link)
    const totalCollected = await prisma.transaction.aggregate({
      where: {
        receiverId: auth.userId,
        type: 'payment_link',
        status: 'completed',
      },
      _sum: { amount: true },
    })

    const activeLinks = links.filter(l => l.status === 'active').length

    return NextResponse.json({
      success: true,
      links,
      stats: {
        totalLinks: stats._count._all,
        activeLinks,
        totalUses: stats._sum.useCount || 0,
        totalCollected: totalCollected._sum.amount || 0,
      },
    })
  } catch (error) {
    console.error('Payment links GET error:', error)
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
    const { amount, currency, description, maxUses, expiresAt } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Montant invalide' }, { status: 400 })
    }
    if (currency !== undefined && !['USD', 'CDF', 'FC'].includes(currency)) {
      return NextResponse.json({ success: false, message: 'Seules les devises USD et CDF sont disponibles.' }, { status: 400 })
    }

    const code = crypto.randomBytes(5).toString('hex')

    // Build allowedMethods string
    // Payments are settled only between Trait accounts until external providers
    // are actually integrated and can confirm settlement.
    const methodsStr = 'wallet'

    const link = await prisma.paymentLink.create({
      data: {
        userId: auth.userId,
        amount: parseFloat(amount),
        currency: currency === 'CDF' ? 'FC' : (currency || 'FC'),
        description: description || null,
        code,
        maxUses: maxUses ? parseInt(maxUses) : 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        allowedMethods: methodsStr,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trait-rho.vercel.app'

    return NextResponse.json({
      success: true,
      link: {
        ...link,
        url: `${baseUrl}/pay/link/${code}`,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Payment links POST error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('id')
    if (!linkId) {
      return NextResponse.json({ success: false, message: 'ID du lien requis' }, { status: 400 })
    }

    await prisma.paymentLink.deleteMany({
      where: { id: linkId, userId: auth.userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment links DELETE error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
