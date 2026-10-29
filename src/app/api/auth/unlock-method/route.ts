import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { canSelectUnlockMethod, isUnlockMethod } from '@/lib/unlock-method-policy'

export async function PUT(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json().catch(() => ({}))
    const method = body?.method
    if (!isUnlockMethod(method)) {
      return NextResponse.json({ success: false, message: 'Méthode de déverrouillage invalide.' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { id: auth.userId }, select: { pin: true, biometricEnabled: true } })
    if (!user) return NextResponse.json({ success: false, message: 'Compte introuvable.' }, { status: 404 })
    const choice = canSelectUnlockMethod(method, { hasPin: !!user.pin, biometricEnrolled: user.biometricEnabled })
    if (!choice.allowed) return NextResponse.json({ success: false, code: choice.code, message: choice.code === 'PIN_REQUIRED' ? 'Configurez d’abord votre code PIN TRAIT.' : 'Enregistrez d’abord la biométrie de cet appareil.' }, { status: 409 })
    const updated = await db.user.update({ where: { id: auth.userId }, data: { unlockMethod: method }, select: { unlockMethod: true, biometricEnabled: true } })
    return NextResponse.json({ success: true, ...updated })
  } catch (error) {
    console.error('Unlock method update failed:', error)
    return NextResponse.json({ success: false, message: 'Impossible d’enregistrer le mode de déverrouillage.' }, { status: 500 })
  }
}
