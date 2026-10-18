import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import crypto from 'crypto'
import {
  serializeJsonArray,
  validateImageList,
  validatePaymentMethodsList,
} from '@/lib/marketplace'

function makeProductQr(productId: string): string {
  return `TRAIT-PROD-${productId}-${crypto.randomBytes(4).toString('hex')}`
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const searchParams = request.nextUrl.searchParams
    const sellerId = searchParams.get('sellerId') || auth.userId

    if (sellerId !== auth.userId) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 403 })
    }

    const products = await db.marketplaceProduct.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error('Get seller products error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { name, description, price, currency, category, images, paymentMethods, stock, condition, sellerPhone, sellerAddress } = body

    if (!name || !description || price === undefined || !category) {
      return NextResponse.json({ success: false, message: 'Champs requis manquants' }, { status: 400 })
    }

    const seller = await db.user.findUnique({ where: { id: auth.userId } })
    if (!seller || seller.suspended) {
      return NextResponse.json({ success: false, message: 'Compte non autorisé' }, { status: 403 })
    }
    if (seller.validationStatus !== 'validated') {
      return NextResponse.json({ success: false, message: 'Compte non validé par l\'administrateur' }, { status: 403 })
    }

    const priceNum = parseFloat(price)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ success: false, message: 'Prix invalide' }, { status: 400 })
    }

    const imageCheck = validateImageList(images)
    if (!imageCheck.ok) {
      return NextResponse.json({ success: false, message: imageCheck.error }, { status: 400 })
    }

    const methodsCheck = validatePaymentMethodsList(paymentMethods)
    if (!methodsCheck.ok) {
      return NextResponse.json({ success: false, message: methodsCheck.error }, { status: 400 })
    }

    const stockNum = Math.max(1, parseInt(String(stock ?? 1), 10) || 1)
    const tempId = crypto.randomUUID()
    const qrCode = makeProductQr(tempId)

    const product = await db.marketplaceProduct.create({
      data: {
        sellerId: auth.userId,
        name: String(name).trim(),
        description: String(description).trim(),
        price: priceNum,
        currency: currency === 'FC' || currency === 'CDF' ? 'FC' : 'USD',
        category: String(category).trim(),
        imageUrl: imageCheck.images[0] || null,
        images: serializeJsonArray(imageCheck.images),
        paymentMethods: serializeJsonArray(methodsCheck.methods),
        sellerPhone: String(sellerPhone || seller.phone || '').trim() || null,
        sellerAddress: String(sellerAddress || '').trim() || null,
        active: true,
        stock: stockNum,
        condition: condition || 'new',
        qrCode,
      },
    })

    // Regenerate QR with real product id
    const finalQr = makeProductQr(product.id)
    const updated = await db.marketplaceProduct.update({
      where: { id: product.id },
      data: { qrCode: finalQr },
    })

    return NextResponse.json({ success: true, product: updated })
  } catch (error) {
    console.error('Create seller product error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { productId, name, description, price, currency, category, imageUrl, images, paymentMethods, stock, condition, active, sellerPhone, sellerAddress } = body

    if (!productId) {
      return NextResponse.json({ success: false, message: 'Produit requis' }, { status: 400 })
    }

    const product = await db.marketplaceProduct.findUnique({ where: { id: productId } })
    if (!product || product.sellerId !== auth.userId) {
      return NextResponse.json({ success: false, message: 'Produit introuvable' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim()
    if (description !== undefined) data.description = String(description).trim()
    if (price !== undefined) {
      const priceNum = parseFloat(price)
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        return NextResponse.json({ success: false, message: 'Prix invalide' }, { status: 400 })
      }
      data.price = priceNum
    }
    if (currency !== undefined) data.currency = currency === 'FC' || currency === 'CDF' ? 'FC' : 'USD'
    if (category !== undefined) data.category = String(category).trim()
    if (images !== undefined) {
      const imageCheck = validateImageList(images)
      if (!imageCheck.ok) {
        return NextResponse.json({ success: false, message: imageCheck.error }, { status: 400 })
      }
      data.images = serializeJsonArray(imageCheck.images)
      data.imageUrl = imageCheck.images[0] || null
    } else if (imageUrl !== undefined) {
      data.imageUrl = imageUrl || null
    }
    if (paymentMethods !== undefined) {
      const methodsCheck = validatePaymentMethodsList(paymentMethods)
      if (!methodsCheck.ok) {
        return NextResponse.json({ success: false, message: methodsCheck.error }, { status: 400 })
      }
      data.paymentMethods = serializeJsonArray(methodsCheck.methods)
    }
    if (sellerPhone !== undefined) data.sellerPhone = String(sellerPhone).trim() || null
    if (sellerAddress !== undefined) data.sellerAddress = String(sellerAddress).trim() || null
    if (stock !== undefined) data.stock = Math.max(0, parseInt(String(stock), 10) || 0)
    if (condition !== undefined) data.condition = condition
    if (active !== undefined) data.active = !!active

    const updated = await db.marketplaceProduct.update({ where: { id: productId }, data })
    return NextResponse.json({ success: true, product: updated })
  } catch (error) {
    console.error('Update seller product error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ success: false, message: 'Paramètres manquants' }, { status: 400 })
    }

    const product = await db.marketplaceProduct.findUnique({ where: { id: productId } })
    if (!product || product.sellerId !== auth.userId) {
      return NextResponse.json({ success: false, message: 'Produit introuvable ou non autorisé' }, { status: 404 })
    }

    await db.marketplaceProduct.delete({ where: { id: productId } })
    return NextResponse.json({ success: true, message: 'Produit supprimé' })
  } catch (error) {
    console.error('Delete seller product error:', error)
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
