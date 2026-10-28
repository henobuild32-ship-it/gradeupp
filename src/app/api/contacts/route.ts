import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const MAX_CONTACTS = 20

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { phones } = body

    if (!Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ success: false, message: 'Liste de numéros de téléphone requise' }, { status: 400 })
    }

    const limitedPhones = phones.slice(0, MAX_CONTACTS)

    const users = await prisma.user.findMany({
      where: { phone: { in: limitedPhones }, deletedAt: null },
      select: {
        phone: true,
        name: true,
        pseudo: true,
      },
    })

    return NextResponse.json({ success: true, contacts: users })
  } catch (error) {
    console.error('Contacts POST error:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
