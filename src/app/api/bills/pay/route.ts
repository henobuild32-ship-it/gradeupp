import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })

  return NextResponse.json({
    success: false,
    code: 'PROVIDER_UNAVAILABLE',
    message: 'Le paiement des factures n’est pas encore raccordé aux fournisseurs. Aucun montant n’a été prélevé.',
  }, { status: 503 })
}
