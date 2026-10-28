import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { transferProviders } from '@/lib/transfers/providers'

export async function GET(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth

  const providers = transferProviders.capabilities()
  return NextResponse.json({
    success: true,
    externalAvailable: providers.length > 0,
    providers,
    message: providers.length
      ? undefined
      : 'Aucun partenaire bancaire ou Mobile Money externe n’est encore connecté. Les transferts Trait entre comptes restent disponibles.',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
