import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};

    if (type) where.type = type;
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, name: true, phone: true, role: true } },
          receiver: { select: { id: true, name: true, phone: true, role: true } },
          agent: { select: { id: true, name: true, agentCode: true } },
        },
      }),
      db.transaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin transactions list error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth
    const adminId = auth.userId

    const { transactionId, action, reason } = await request.json();

    if (!transactionId || !action) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        sender: { select: { name: true, phone: true } },
        receiver: { select: { name: true, phone: true } },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction non trouvée' },
        { status: 404 }
      );
    }

    if (action === 'validate' || action === 'cancel') {
      return NextResponse.json(
        {
          success: false,
          message: 'La validation ou l’annulation financière doit être effectuée depuis le flux métier concerné afin de garantir les mouvements de solde.',
        },
        { status: 400 }
      );
    }

    if (action === 'block') {
      if (!reason) {
        return NextResponse.json(
          { success: false, message: 'Motif de blocage requis' },
          { status: 400 }
        );
      }

      if (transaction.status !== 'pending') {
        return NextResponse.json(
          { success: false, message: 'Seules les transactions en attente peuvent être bloquées.' },
          { status: 400 }
        );
      }

      await db.$transaction([
        db.transaction.update({
          where: { id: transactionId },
          data: { status: 'blocked', blockReason: reason },
        }),
        db.adminActivityLog.create({
          data: {
            adminId,
            action: 'block_transaction',
            target: transactionId,
            details: `Transaction ${transactionId.substring(0, 8)}... bloquée. Motif: ${reason}. Montant: ${transaction.amount} ${transaction.currency}`,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Transaction bloquée' });
    }

    return NextResponse.json(
      { success: false, message: 'Action non reconnue' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin transaction action error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
