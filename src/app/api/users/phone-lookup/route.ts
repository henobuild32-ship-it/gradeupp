import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { findUserByPhone } from '@/lib/phone'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { success: false, message: 'Numéro de téléphone requis' },
        { status: 400 }
      )
    }

    const user = await findUserByPhone(phone)

    if (!user) {
      return NextResponse.json({
        success: false,
        found: false,
        message: 'Aucun compte TRAIT trouvé pour ce numéro',
      })
    }

    if (user.suspended) {
      return NextResponse.json({
        success: false,
        found: true,
        message: 'Ce compte est suspendu',
      })
    }

    return NextResponse.json({
      success: true,
      found: true,
      user: {
        id: user.id,
        name: user.name || user.pseudo || 'Utilisateur TRAIT',
        phone: user.phone,
        role: user.role,
        isTraitUser: true,
      },
    })
  } catch (error) {
    console.error('Phone lookup error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
