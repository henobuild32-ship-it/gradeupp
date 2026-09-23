import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    const where: any = { senderId: auth.userId }
    if (type !== 'all') {
      where.type = type
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
      include: {
        sender: { select: { name: true, phone: true } },
        receiver: { select: { name: true, phone: true } },
      },
    })

    const csvHeader = 'Date,Type,Montant,Devise,Frais,Statut,Description,Expéditeur,Bénéficiaire\n'
    const typeLabels: Record<string, string> = {
      transfer: 'Transfert',
      send: 'Envoi',
      receive: 'Réception',
      qr_payment: 'Paiement QR',
      withdrawal: 'Retrait',
      deposit: 'Dépôt',
      international_transfer: 'Transfert International',
      barter: 'Barter',
      card_payment: 'Paiement Carte',
      child_recharge: 'Recharge carte enfant',
    }
    const statusLabels: Record<string, string> = {
      completed: 'Terminé',
      pending: 'En attente',
      failed: 'Échoué',
    }
    const csvRows = transactions.map((t) => {
      const date = new Date(t.createdAt).toLocaleDateString('fr-FR')
      const typeLabel = typeLabels[t.type] || t.type
      const statusLabel = statusLabels[t.status] || t.status

      return [
        date,
        typeLabel,
        t.amount.toFixed(2),
        t.currency,
        t.fee.toFixed(2),
        statusLabel,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.sender?.name || t.sender?.phone || '',
        t.receiver?.name || t.receiver?.phone || '',
      ].join(',')
    }).join('\n')

    const csv = csvHeader + csvRows

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export CSV error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
