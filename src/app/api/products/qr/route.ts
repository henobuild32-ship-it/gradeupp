import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// GET /api/products/qr?code=TRAIT-PROD-...
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const code = request.nextUrl.searchParams.get('code') || ''
    if (!code) {
      return NextResponse.json({ success: false, message: 'Code requis' }, { status: 400 })
    }

    const product = await db.marketplaceProduct.findFirst({
      where: {
        OR: [{ qrCode: code }, { id: code }],
        active: true,
      },
      include: {
        seller: {
          select: { id: true, name: true, pseudo: true, phone: true, businessName: true, validationStatus: true },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ success: false, message: 'Produit introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        category: product.category,
        condition: product.condition,
        imageUrl: product.imageUrl,
        stock: product.stock,
        active: product.active,
        qrCode: product.qrCode,
        seller: product.seller,
      },
    })
  } catch (error) {
    console.error('Product QR lookup error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
