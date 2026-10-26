import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

const SERVICE_UNAVAILABLE = 'Les recharges opérateur ne sont pas encore raccordées. Aucun montant n’a été prélevé.'

export async function POST(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `ussd-credit:${auth.userId}:${ip}` })
  if (!limit.allowed) return rateLimitResponse(limit.resetIn)

  return NextResponse.json({ success: false, code: 'PROVIDER_UNAVAILABLE', message: SERVICE_UNAVAILABLE }, { status: 503 })
}
