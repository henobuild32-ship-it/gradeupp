import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const { transactionId } = await params
    if (!transactionId || transactionId.length > 128) {
      return NextResponse.json({ success: false, message: 'Référence invalide' }, { status: 400 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        type: true,
        amount: true,
        fee: true,
        currency: true,
        receivingCurrency: true,
        amountReceived: true,
        exchangeRate: true,
        status: true,
        createdAt: true,
      },
    })

    if (!transaction || transaction.status !== 'completed') {
      return NextResponse.json(
        { success: false, message: 'Aucun reçu confirmé ne correspond à cette référence.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json({
      success: true,
      brand: 'Trait Fintech',
      receiptNumber: `RCP-${transaction.id.toUpperCase()}`,
      status: 'completed',
      type: transaction.type,
      amount: transaction.amount,
      fee: transaction.fee,
      currency: transaction.currency,
      receivingCurrency: transaction.receivingCurrency ?? transaction.currency,
      amountReceived: transaction.amountReceived ?? transaction.amount,
      exchangeRate: transaction.exchangeRate,
      createdAt: transaction.createdAt,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Receipt verification error:', error)
    return NextResponse.json({ success: false, message: 'Vérification indisponible' }, { status: 500 })
  }
}
