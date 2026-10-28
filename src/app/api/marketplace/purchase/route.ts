import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { normalizeCurrency } from '@/lib/currency'

function purchaseResponse(purchase: any, duplicate = false, transactionId: string | null = null) {
  return NextResponse.json({
    success: true,
    ...(duplicate ? { duplicate: true } : {}),
    transactionId,
    purchase: {
      id: purchase.id,
      productId: purchase.productId,
      buyerId: purchase.buyerId,
      amount: purchase.amount,
      quantity: purchase.quantity,
      usedBonus: purchase.usedBonus,
      usedReal: purchase.usedReal,
      currency: purchase.product?.currency || 'USD',
      status: purchase.status,
      createdAt: purchase.createdAt,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const body = await request.json()
    const { productId, buyerId, useBonus, useReal, quantity, clientRequestId } = body as {
      productId: string
      buyerId: string
      useBonus?: boolean
      useReal?: boolean
      quantity?: number
      clientRequestId?: string
    }

    if (!productId || !buyerId) {
      return NextResponse.json(
        { success: false, message: 'Product ID and buyer ID are required' },
        { status: 400 }
      )
    }

    if (auth.userId !== buyerId) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      )
    }

    const qty = Math.min(10, Math.max(1, Math.floor(Number(quantity) || 1)))
    if (clientRequestId !== undefined && (typeof clientRequestId !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(clientRequestId))) {
      return NextResponse.json({ success: false, message: 'Référence de demande invalide.' }, { status: 400 })
    }
    const requestId = typeof clientRequestId === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(clientRequestId)
      ? clientRequestId
      : undefined
    const willUseBonus = useBonus === true
    const willUseReal = useReal !== false // default true unless explicitly specified
    const requestFingerprint = requestId
      ? createHash('sha256').update(JSON.stringify({ productId, buyerId, quantity: qty, useBonus: willUseBonus, useReal: willUseReal })).digest('hex')
      : null

    if (requestId) {
      const existing = await (db.purchase as any).findUnique({
        where: { clientRequestId: requestId },
        include: { product: { select: { currency: true } } },
      })
      if (existing) {
        if (existing.buyerId !== buyerId) {
          return NextResponse.json({ success: false, message: 'Référence de demande déjà utilisée.' }, { status: 409 })
        }
        if (existing.requestFingerprint && existing.requestFingerprint !== requestFingerprint) {
          return NextResponse.json({ success: false, message: 'Cette référence est déjà associée à une autre demande.' }, { status: 409 })
        }
        const transaction = await db.transaction.findUnique({
          where: { senderId_clientRequestId: { senderId: buyerId, clientRequestId: `market:${requestId}` } },
          select: { id: true },
        }).catch(() => null)
        return purchaseResponse(existing, true, transaction?.id ?? null)
      }
    }

    // ─── Get product ─────────────────────────────────────────────────
    const product = await db.marketplaceProduct.findUnique({
      where: { id: productId },
      include: { seller: true },
    })

    if (!product || !product.active) {
      return NextResponse.json(
        { success: false, message: 'Product not found or unavailable' },
        { status: 404 }
      )
    }

    if (product.stock !== undefined && product.stock !== null && product.stock < qty) {
      return NextResponse.json(
        { success: false, message: product.stock < 1 ? 'Produit en rupture de stock' : 'Stock insuffisant pour cette quantité' },
        { status: 409 }
      )
    }

    // ─── Get buyer ───────────────────────────────────────────────────
    const buyer = await db.user.findUnique({
      where: { id: buyerId },
    })

    if (!buyer) {
      return NextResponse.json(
        { success: false, message: 'Buyer not found' },
        { status: 404 }
      )
    }

    // ─── Cannot buy own product ──────────────────────────────────────
    if (product.sellerId === buyerId) {
      return NextResponse.json(
        { success: false, message: 'You cannot purchase your own product' },
        { status: 400 }
      )
    }

    // ─── Determine currency ──────────────────────────────────────────
    const currency = normalizeCurrency(product.currency)
    const isFC = currency === 'CDF'

    // ─── Determine effective unit price ─────────────────────────────
    const effectiveUnitPrice = willUseBonus && product.bonusPrice !== null && product.bonusPrice !== undefined
      ? product.bonusPrice
      : product.price

    if (!Number.isFinite(effectiveUnitPrice) || effectiveUnitPrice <= 0) {
      return NextResponse.json({ success: false, message: 'Prix du produit invalide' }, { status: 409 })
    }

    const effectivePrice = effectiveUnitPrice * qty

    // ─── Validate bonus-related rules ────────────────────────────────

    // Rule: If product is bonusOnly and user is NOT using bonus, reject
    if (product.bonusOnly && !willUseBonus) {
      return NextResponse.json(
        { success: false, message: 'This product can only be purchased with bonus balance' },
        { status: 400 }
      )
    }

    // Rule: If user wants to use bonus, check bonus is enabled on product
    if (willUseBonus && !product.bonusEnabled) {
      return NextResponse.json(
        { success: false, message: 'Bonus payment is not enabled for this product' },
        { status: 400 }
      )
    }

    // Rule: Check buyer is not bonus-blocked
    if (willUseBonus && buyer.bonusBlocked) {
      return NextResponse.json(
        { success: false, message: `Your bonus usage has been blocked. Reason: ${buyer.bonusBlockedReason || 'Contact support'}` },
        { status: 403 }
      )
    }

    // Rule: Check bonus expiry
    if (willUseBonus && product.bonusExpiryAt && new Date() > new Date(product.bonusExpiryAt)) {
      return NextResponse.json(
        { success: false, message: 'Bonus purchase period for this product has expired' },
        { status: 400 }
      )
    }

    // Rule: Check bonusMaxQty per user
    if (willUseBonus && product.bonusMaxQty !== null) {
      const existingBonusQty = await db.purchase.aggregate({
        where: {
          productId,
          buyerId,
          usedBonus: { gt: 0 },
        },
        _sum: { quantity: true },
      })

      const alreadyBought = existingBonusQty._sum.quantity || 0
      if (alreadyBought + qty > product.bonusMaxQty) {
        return NextResponse.json(
          { success: false, message: `Vous avez atteint la limite de ${product.bonusMaxQty} achat(s) bonus pour ce produit` },
          { status: 400 }
        )
      }
    }

    // ─── Calculate payment split ─────────────────────────────────────
    let usedBonus = 0
    let usedReal = 0

    if (willUseBonus && !willUseReal) {
      // Pure bonus payment
      const bonusBalance = isFC ? buyer.bonusBalanceFC : buyer.bonusBalance
      if (bonusBalance < effectivePrice) {
        return NextResponse.json(
          {
            success: false,
            message: `Insufficient bonus balance. You need ${effectivePrice.toFixed(2)} ${currency} but have ${bonusBalance.toFixed(2)} ${currency}.`,
          },
          { status: 400 }
        )
      }
      usedBonus = effectivePrice
      usedReal = 0
    } else if (willUseBonus && willUseReal) {
      // Mixed payment: use bonus first, then real
      const bonusBalance = isFC ? buyer.bonusBalanceFC : buyer.bonusBalance
      const realBalance = isFC ? buyer.realBalanceFC : buyer.realBalance

      usedBonus = Math.min(bonusBalance, effectivePrice)
      usedReal = effectivePrice - usedBonus

      if (realBalance < usedReal) {
        return NextResponse.json(
          {
            success: false,
            message: `Insufficient balance. Bonus covers ${usedBonus.toFixed(2)} ${currency}, but you need ${usedReal.toFixed(2)} ${currency} more in real balance (you have ${realBalance.toFixed(2)} ${currency}).`,
          },
          { status: 400 }
        )
      }
    } else {
      // Pure real payment
      usedReal = effectivePrice
    }

    const realField = isFC ? 'realBalanceFC' : 'realBalance'
    const bonusField = isFC ? 'bonusBalanceFC' : 'bonusBalance'
    let duplicateFromRace = false
    const purchase = await db.$transaction(async (tx) => {
      const debit = await tx.user.updateMany({
        where: { id: buyerId, [realField]: { gte: usedReal }, [bonusField]: { gte: usedBonus } },
        data: {
          [realField]: { decrement: usedReal },
          [bonusField]: { decrement: usedBonus },
        },
      })
      if (debit.count !== 1) throw new Error('INSUFFICIENT_BALANCE')

      // Decrement stock atomically (prevent oversell)
      const stockDec = await tx.marketplaceProduct.updateMany({
        where: { id: productId, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      })
      if (stockDec.count !== 1) throw new Error('OUT_OF_STOCK')

      const created = await (tx.purchase as any).create({
        data: {
          productId,
          buyerId,
          amount: effectivePrice,
          quantity: qty,
          usedBonus,
          usedReal,
          status: 'completed',
          clientRequestId: requestId,
          requestFingerprint,
        },
        include: {
          product: true,
          buyer: { select: { id: true, name: true, pseudo: true } },
        },
      })

      // Create order for buyer/seller visibility (only when product has a seller)
      let transactionId: string | null = null
      if (product.sellerId) {
        await tx.order.create({
          data: {
            buyerId,
            sellerId: product.sellerId,
            productId,
            quantity: qty,
            amount: effectivePrice,
            currency,
            status: 'paid',
            paymentStatus: 'paid',
          },
        })

        await tx.user.update({
          where: { id: product.sellerId },
          data: {
            [isFC ? 'realBalanceFC' : 'realBalance']: { increment: effectivePrice },
          },
        })
        const transaction = await tx.transaction.create({
          data: {
            type: 'purchase',
            amount: effectivePrice,
            fee: 0,
            currency,
            receivingCurrency: currency,
            amountReceived: effectivePrice,
            status: 'completed',
            senderId: buyerId,
            receiverId: product.sellerId,
            description: `Achat Marketplace : ${qty} × ${product.name}`.slice(0, 200),
            ...(requestId ? {
              clientRequestId: `market:${requestId}`,
              requestFingerprint,
            } : {}),
          },
          select: { id: true },
        })
        transactionId = transaction.id
      }

      if (usedBonus > 0) {
        await tx.bonusHistory.create({
          data: {
            userId: buyerId,
            type: 'purchase',
            amount: -usedBonus,
            currency,
            description: `Purchased "${product.name}" using bonus balance`,
            metadata: JSON.stringify({
              productId: product.id,
              productName: product.name,
              purchaseId: created.id,
              bonusUsed: usedBonus,
              realUsed: usedReal,
              totalPrice: effectivePrice,
            }),
          },
        })
      }

      const purchaseNotifications = [
        ...(product.sellerId ? [{
          userId: product.sellerId,
          title: 'New Purchase',
          message: `${buyer.name || buyer.pseudo || 'Someone'} purchased ${qty}x "${product.name}" for ${effectivePrice.toFixed(2)} ${currency}${usedBonus > 0 ? ' (bonus payment)' : ''}`,
          type: 'purchase',
        }] : []),
        {
          userId: buyer.id,
          title: 'Achat confirmé',
          message: `Votre achat de ${qty}x "${product.name}" pour ${effectivePrice.toFixed(2)} ${currency} a été confirmé. ${usedBonus > 0 ? `Bonus utilisé: ${usedBonus.toFixed(2)} ${currency}.` : ''}`,
          type: 'purchase',
        },
      ]
      await tx.notification.createMany({ data: purchaseNotifications })

      return { ...created, transactionId }
    }).catch(async (error) => {
      if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') return null
      if (error instanceof Error && error.message === 'OUT_OF_STOCK') return 'OOS'
      if (requestId && typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        const existing = await (db.purchase as any).findUnique({
          where: { clientRequestId: requestId },
          include: { product: true, buyer: { select: { id: true, name: true, pseudo: true } } },
        })
        if (existing) {
          if (existing.buyerId !== buyerId || (existing.requestFingerprint && existing.requestFingerprint !== requestFingerprint)) return 'CONFLICT'
          duplicateFromRace = true
          return existing
        }
      }
      throw error
    })

    if (purchase === 'OOS') {
      return NextResponse.json({ success: false, message: 'Produit en rupture de stock' }, { status: 409 })
    }
    if (purchase === 'CONFLICT') {
      return NextResponse.json({ success: false, message: 'Référence de demande déjà utilisée.' }, { status: 409 })
    }
    if (!purchase) return NextResponse.json({ success: false, message: 'Solde insuffisant' }, { status: 400 })
    if (duplicateFromRace) {
      const transaction = requestId
        ? await db.transaction.findUnique({ where: { senderId_clientRequestId: { senderId: buyerId, clientRequestId: `market:${requestId}` } }, select: { id: true } }).catch(() => null)
        : null
      return purchaseResponse(purchase, true, transaction?.id ?? null)
    }

    // Push notifications to both buyer and seller
    const { sendPushToUser } = await import('@/lib/push').catch(() => ({ sendPushToUser: null }))
    if (sendPushToUser) {
      if (product.sellerId) {
        sendPushToUser(product.sellerId, {
          title: 'Nouvel achat',
          body: `${buyer.name || buyer.pseudo || 'Quelqu\'un'} a acheté "${product.name}" pour ${effectivePrice.toFixed(2)} ${currency}.`,
          url: '/seller-dashboard',
        }).catch(() => {})
      }
      sendPushToUser(buyer.id, {
        title: 'Achat confirmé',
        body: `"${product.name}" acheté pour ${effectivePrice.toFixed(2)} ${currency}. Merci !`,
        url: '/marketplace',
      }).catch(() => {})
    }

    return purchaseResponse(purchase, false, purchase.transactionId ?? null)
  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
