import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    serviceAvailable: false,
    message: 'Aucun fournisseur de factures n’est raccordé. Les paiements externes restent désactivés.',
    billers: [],
  }, { headers: { 'Cache-Control': 'no-store' } })
}
