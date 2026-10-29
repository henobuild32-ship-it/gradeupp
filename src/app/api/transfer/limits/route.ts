import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getUserDailyLimits } from '@/lib/financial-policy'

export async function GET(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth
  try {
    return NextResponse.json({ success: true, limits: await getUserDailyLimits(auth.userId) })
  } catch (error) {
    console.error('Daily limits lookup failed:', error)
    return NextResponse.json({ success: false, message: 'Impossible de charger les plafonds du jour.' }, { status: 500 })
  }
}
