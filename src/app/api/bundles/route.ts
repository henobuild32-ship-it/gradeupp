import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    serviceAvailable: false,
    message: 'Aucun fournisseur externe de recharges ou d’abonnements n’est raccordé. Les paiements externes restent désactivés.',
    categories: [],
  }, { headers: { 'Cache-Control': 'no-store' } })
}
