import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

/**
 * Legacy endpoint retired: it used to debit wallets for external rails that
 * were not connected to a settlement provider. All live transfers must use
 * /api/transfer/send, which credits a registered Trait account atomically.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({
    success: false,
    code: 'TRAIT_ACCOUNT_REQUIRED',
    message: 'Les transferts sont disponibles vers un numéro enregistré dans Trait. Les virements bancaires et paiements Mobile Money externes ne sont pas activés.',
  }, { status: 410, headers: { 'Cache-Control': 'no-store' } })
}
