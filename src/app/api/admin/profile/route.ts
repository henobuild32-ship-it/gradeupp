import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/** Returns the current administrator from the signed server session only. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = await db.admin.findUnique({
      where: { id: auth.userId },
      select: { id: true, username: true, name: true, role: true },
    })

    if (!admin) {
      return NextResponse.json({ success: false, message: 'Administrateur introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, admin })
  } catch (error) {
    console.error('Admin profile error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
