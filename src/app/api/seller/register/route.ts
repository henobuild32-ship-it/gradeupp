import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const SellerRegisterSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,19}$/, 'Numéro de téléphone invalide'),
  name: z.string().trim().min(1, 'Le nom complet est obligatoire').max(100),
  email: z.string().trim().email('Adresse email invalide').max(254),
  city: z.string().trim().min(1, 'La ville est obligatoire').max(100),
  address: z.string().trim().max(200).optional().default(''),
  businessName: z.string().trim().min(1, 'Le nom du commerce est obligatoire').max(120),
  businessType: z.string().trim().min(1, 'Le type de commerce est obligatoire').max(80),
  location: z.string().trim().min(1, 'La localisation est obligatoire').max(200),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128),
})

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit({ windowMs: 60000, maxRequests: 3, key: `seller-register:${ip}` })
    if (!rl.allowed) return rateLimitResponse(rl.resetIn)

    const body = await request.json()
    const validation = SellerRegisterSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0]?.message || 'Vérifiez les informations saisies' },
        { status: 400 }
      )
    }
    const { phone, name, email, city, address, businessName, businessType, location, password } = validation.data

    const existingUser = await db.user.findUnique({
      where: { phone },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Ce numéro de téléphone est déjà enregistré' },
        { status: 409 }
      )
    }

    if (email) {
      const existingEmail = await db.user.findFirst({
        where: { email: email.trim().toLowerCase() },
      })
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Cette adresse email est déjà utilisée' },
          { status: 409 }
        )
      }
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        phone,
        name,
        email: email.toLowerCase(),
        city,
        address: address || null,
        country: 'CD',
        businessName,
        businessType,
        location,
        password: hashedPassword,
        role: 'seller',
        validationStatus: 'pending',
        realBalance: 0,
        realBalanceFC: 0,
        bonusBalance: 0,
        bonusBalanceFC: 0,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        validationStatus: user.validationStatus,
        businessName: user.businessName,
        city: user.city,
        location: user.location,
      },
    })
  } catch (error) {
    console.error('Seller Register error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
