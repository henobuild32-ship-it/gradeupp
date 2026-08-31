import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';

function generateAgentCode(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return `AGT-${cleaned}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { role: 'agent' };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { agentCode: { contains: search } },
      ];
    }

    const [agents, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          phone: true,
          name: true,
          pseudo: true,
          country: true,
          agentCode: true,
          realBalance: true,
          bonusBalance: true,
          isVerified: true,
          suspended: true,
          suspensionReason: true,
          createdAt: true,
          _count: {
            select: {
              agentDeposits: true,
              agentWithdrawals: true,
              agentTransactions: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      agents,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin agents list error:', error);
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

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    if (action === 'create') {
      const { name, phone, country, password, location } = body;

      if (!name || !phone || !password) {
        return NextResponse.json(
          { success: false, message: 'Nom, téléphone et mot de passe requis' },
          { status: 400 }
        );
      }

      const existing = await db.user.findUnique({ where: { phone } });
      if (existing) {
        return NextResponse.json(
          { success: false, message: 'Ce numéro de téléphone est déjà utilisé' },
          { status: 400 }
        );
      }

      let agentCode = generateAgentCode(phone);
      let codeExists = await db.user.findUnique({ where: { agentCode } });
      while (codeExists) {
        agentCode = generateAgentCode(phone) + '-' + Math.floor(Math.random() * 100);
        codeExists = await db.user.findUnique({ where: { agentCode } });
      }

      const hashedPassword = await hashPassword(password)

      const agent = await db.user.create({
        data: {
          name,
          phone,
          country: country || 'TG',
          role: 'agent',
          agentCode,
          agentNumber: agentCode,
          password: hashedPassword,
          realBalance: 0,
          bonusBalance: 0,
          isVerified: true,
          hasCompletedOnboarding: true,
        },
      });

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'create_agent',
          target: agent.id,
          details: `Agent créé: ${name} (${phone}) - Code: ${agentCode}${location ? ` - Localisation: ${location}` : ''}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Agent créé avec succès',
        agent: {
          id: agent.id,
          name: agent.name,
          phone: agent.phone,
          agentCode: agent.agentCode,
        },
      });
    }

    if (action === 'suspend') {
      const { agentId, reason } = body;
      if (!agentId || !reason) {
        return NextResponse.json(
          { success: false, message: 'ID agent et motif requis' },
          { status: 400 }
        );
      }

      const agent = await db.user.findUnique({ where: { id: agentId } });
      if (!agent) {
        return NextResponse.json(
          { success: false, message: 'Agent non trouvé' },
          { status: 404 }
        );
      }

      await db.user.update({
        where: { id: agentId },
        data: { suspended: true, suspensionReason: reason },
      });

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'suspend_agent',
          target: agentId,
          details: `Agent ${agent.name} suspendu. Motif: ${reason}`,
        },
      });

      return NextResponse.json({ success: true, message: 'Agent suspendu' });
    }

    if (action === 'unsuspend') {
      const { agentId } = body;
      const agent = await db.user.findUnique({ where: { id: agentId } });
      if (!agent) {
        return NextResponse.json(
          { success: false, message: 'Agent non trouvé' },
          { status: 404 }
        );
      }

      await db.user.update({
        where: { id: agentId },
        data: { suspended: false, suspensionReason: null },
      });

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'unsuspend_agent',
          target: agentId,
          details: `Agent ${agent.name} réactivé`,
        },
      });

      return NextResponse.json({ success: true, message: 'Agent réactivé' });
    }

    if (action === 'delete') {
      const { agentId } = body;
      const agent = await db.user.findUnique({ where: { id: agentId } });
      if (!agent) {
        return NextResponse.json(
          { success: false, message: 'Agent non trouvé' },
          { status: 404 }
        );
      }

      await db.user.delete({ where: { id: agentId } });

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'delete_agent',
          target: agentId,
          details: `Agent ${agent.name} (${agent.agentCode}) supprimé définitivement`,
        },
      });

      return NextResponse.json({ success: true, message: 'Agent supprimé' });
    }

    if (action === 'update') {
      const { agentId, name, phone, country } = body;
      if (!agentId) {
        return NextResponse.json(
          { success: false, message: 'ID agent requis' },
          { status: 400 }
        );
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (country) updateData.country = country;

      const updated = await db.user.update({
        where: { id: agentId },
        data: updateData,
      });

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'update_agent',
          target: agentId,
          details: `Agent ${name || updated.name} modifié`,
        },
      });

      return NextResponse.json({ success: true, message: 'Agent modifié', agent: updated });
    }

    return NextResponse.json(
      { success: false, message: 'Action non reconnue' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin agent action error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
