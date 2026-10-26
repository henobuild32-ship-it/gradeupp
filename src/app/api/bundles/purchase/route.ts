import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })

  return NextResponse.json({
    success: false,
    code: 'PROVIDER_UNAVAILABLE',
    message: 'Les achats de crédit et de bundles ne sont pas encore raccordés aux opérateurs. Aucun montant n’a été prélevé.',
  }, { status: 503 })
}
