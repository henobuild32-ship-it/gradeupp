import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { findAgentByIdentifier } from '@/lib/agents';

export async function GET(request: NextRequest) {
  try {
    // Allow authenticated users (cookie or Bearer); still allow unauthenticated lookup for app UX
    await getAuthUser(request);

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ success: false, message: 'Code agent requis' }, { status: 400 });
    }

    const found = await findAgentByIdentifier(code);

    if (!found) {
      return NextResponse.json({
        success: false,
        message: 'Agent non trouvé. Vérifiez le code agent (ex: AGT-123456).',
      });
    }

    if (found.suspended) {
      return NextResponse.json({
        success: false,
        message: 'Cet agent est suspendu.',
      });
    }

    if (found.validationStatus !== 'validated') {
      return NextResponse.json({
        success: false,
        message: "Cet agent n'est pas encore validé. Validez-le dans Gestion Agents.",
      });
    }

    return NextResponse.json({
      success: true,
      agent: {
        name: found.businessName || found.name || found.pseudo || 'Agent',
        code: found.agentCode || found.agentNumber,
        phone: found.phone,
      },
    });
  } catch (error) {
    console.error('Agent lookup error:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne' }, { status: 500 });
  }
}
