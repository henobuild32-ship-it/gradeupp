import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import crypto from 'crypto'

function makeProductQr(productId: string): string {
  return `TRAIT-PROD-${productId}-${crypto.randomBytes(4).toString('hex')}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const sellerId = searchParams.get('sellerId')

    const whereClause: Record<string, unknown> = { active: true }
    if (category && category.trim() !== '') {
      whereClause.category = category.trim()
    }
    if (sellerId && sellerId.trim() !== '') {
      whereClause.sellerId = sellerId.trim()
    }

    const products = await db.marketplaceProduct.findMany({
      where: whereClause,
      include: {
        seller: {
          select: { id: true, name: true, pseudo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        category: p.category,
        imageUrl: p.imageUrl,
        active: p.active,
        stock: p.stock,
        condition: p.condition,
        qrCode: p.qrCode,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        seller: p.seller,
        // Bonus fields
        bonus: {
          enabled: p.bonusEnabled,
          only: p.bonusOnly,
          bonusPrice: p.bonusPrice,
          maxQty: p.bonusMaxQty,
          expiryAt: p.bonusExpiryAt,
        },
      })),
    })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: any authenticated user can list a product on the marketplace
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { name, description, price, currency, category, imageUrl, stock, condition } = body

    if (!name || !description || price === undefined || !category) {
      return NextResponse.json({ success: false, message: 'Champs requis manquants' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: auth.userId } })
    if (!user || user.suspended) {
      return NextResponse.json({ success: false, message: 'Compte non autorisé' }, { status: 403 })
    }

    const priceNum = parseFloat(price)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ success: false, message: 'Prix invalide' }, { status: 400 })
    }

    const stockNum = Math.max(1, parseInt(String(stock ?? 1), 10) || 1)
    const tempId = crypto.randomUUID()

    let product = await db.marketplaceProduct.create({
      data: {
        sellerId: auth.userId,
        name: String(name).trim(),
        description: String(description).trim(),
        price: priceNum,
        currency: currency === 'FC' || currency === 'CDF' ? 'FC' : 'USD',
        category: String(category).trim(),
        imageUrl: imageUrl || null,
        active: true,
        stock: stockNum,
        condition: condition || 'new',
        qrCode: makeProductQr(tempId),
      },
    })

    const finalQr = makeProductQr(product.id)
    product = await db.marketplaceProduct.update({
      where: { id: product.id },
      data: { qrCode: finalQr },
    })

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Create marketplace product error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
