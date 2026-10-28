import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, requireAdmin } from '@/lib/auth'

const invoiceNumberFrom = (description: string | null | undefined) => description?.match(/\bFAC-[A-Z0-9]+\b/i)?.[0]?.toUpperCase() ?? null

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    let isAdmin = false
    if (!auth) {
      const admin = await requireAdmin(request)
      if (admin instanceof NextResponse) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
      }
      isAdmin = true
    }

    const body = await request.json()
    const { transactionId } = body

    if (typeof transactionId !== 'string' || transactionId.length < 1 || transactionId.length > 128) {
      return NextResponse.json({ success: false, message: 'ID de transaction requis' }, { status: 400 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        sender: { select: { id: true, name: true, pseudo: true, phone: true, deletedAt: true } },
        receiver: { select: { id: true, name: true, pseudo: true, phone: true, deletedAt: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Transaction introuvable' }, { status: 404 })
    }

    if (transaction.status !== 'completed') {
      return NextResponse.json(
        { success: false, message: 'Un reçu est disponible uniquement après confirmation de la transaction.', code: 'RECEIPT_NOT_READY' },
        { status: 409, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    if (!isAdmin && transaction.senderId !== auth?.userId && transaction.receiverId !== auth?.userId) {
      const admin = await requireAdmin(request)
      if (admin instanceof NextResponse) {
        return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 })
      }
    }

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { transactionId: transaction.id },
      select: { id: true, description: true },
    })
    const receiptNumber = `RCP-${transaction.id.toUpperCase()}`

    const receipt = {
      receiptNumber,
      invoiceNumber: invoiceNumberFrom(paymentRequest?.description),
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        fee: transaction.fee,
        currency: transaction.currency,
        receivingCurrency: transaction.receivingCurrency,
        amountReceived: transaction.amountReceived,
        exchangeRate: transaction.exchangeRate,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
      sender: {
        id: transaction.sender.id,
        name: transaction.sender.deletedAt ? 'Compte supprimé' : transaction.sender.name,
        pseudo: transaction.sender.deletedAt ? null : transaction.sender.pseudo,
        phone: transaction.sender.deletedAt ? null : transaction.sender.phone,
      },
      receiver: {
        id: transaction.receiver.id,
        name: transaction.receiver.deletedAt ? 'Compte supprimé' : transaction.receiver.name,
        pseudo: transaction.receiver.deletedAt ? null : transaction.receiver.pseudo,
        phone: transaction.receiver.deletedAt ? null : transaction.receiver.phone,
      },
      generatedAt: new Date().toISOString(),
      brand: 'Trait Fintech',
    }

    return NextResponse.json({ success: true, receipt })
  } catch (error) {
    console.error('Receipt POST error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
