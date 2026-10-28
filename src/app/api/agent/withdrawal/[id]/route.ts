import { NextResponse } from 'next/server'

/**
 * Retired legacy route. It accepted PIN-less withdrawal submissions and wrote
 * the wallet debit, withdrawal, and transaction in separate database calls.
 * New requests must use the authenticated, PIN-checked atomic withdrawal API.
 */
export async function PUT() {
  return NextResponse.json({
    success: false,
    code: 'LEGACY_WITHDRAWAL_ENDPOINT_RETIRED',
    message: 'Cette route n’accepte plus de demandes. Utilisez le parcours de retrait Trait sécurisé.',
  }, { status: 410 })
}
