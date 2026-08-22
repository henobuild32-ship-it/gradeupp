import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, message: 'Code agent requis' },
        { status: 400 }
      )
    }

    const normalized = code.trim().toUpperCase()

    const agent = await db.user.findFirst({
      where: {
        role: 'agent',
        suspended: false,
        validationStatus: 'validated',
        OR: [
          { agentCode: normalized },
          { agentNumber: normalized },
        ],
      },
      select: {
        id: true,
        name: true,
        pseudo: true,
        phone: true,
        agentCode: true,
        agentNumber: true,
        businessName: true,
      },
    })

    if (!agent) {
      return NextResponse.json({
        success: false,
        found: false,
        message: 'Agent non trouvé. Vérifiez le code.',
      })
    }

    return NextResponse.json({
      success: true,
      found: true,
      agent: {
        id: agent.id,
        name: agent.businessName || agent.name || agent.pseudo || 'Agent TRAIT',
        phone: agent.phone,
        agentCode: agent.agentCode || agent.agentNumber,
      },
    })
  } catch (error) {
    console.error('Agent code lookup error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
