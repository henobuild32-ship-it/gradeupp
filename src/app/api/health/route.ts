import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code || 'UNKNOWN')
      : 'UNKNOWN'
    console.error('Health check failed:', code)
    return NextResponse.json({
      success: false,
      message: 'Service temporairement indisponible',
    }, { status: 503 })
  }
}
