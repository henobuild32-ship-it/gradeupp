import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { findAgentByIdentifier } from '@/lib/agents'

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

    const found = await findAgentByIdentifier(code)

    if (!found) {
      return NextResponse.json({
        success: false,
        found: false,
        message: 'Agent non trouvé. Vérifiez le code.',
      })
    }

    if (found.suspended) {
      return NextResponse.json({
        success: false,
        found: false,
        message: 'Cet agent est suspendu.',
      })
    }

    if (found.validationStatus !== 'validated') {
      return NextResponse.json({
        success: false,
        found: false,
        message: "Cet agent n'est pas encore validé.",
      })
    }

    return NextResponse.json({
      success: true,
      found: true,
      agent: {
        id: found.id,
        name: found.businessName || found.name || found.pseudo || 'Agent TRAIT',
        phone: found.phone,
        agentCode: found.agentCode || found.agentNumber,
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
