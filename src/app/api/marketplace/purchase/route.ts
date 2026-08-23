import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { safeDeduct } from '@/lib/balance'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const body = await request.json()
    const { productId, buyerId, useBonus, useReal } = body as {
      productId: string
      buyerId: string
      useBonus?: boolean
      useReal?: boolean
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

    // Defaults: if neither specified, use real balance only (backward compat)
    const willUseBonus = useBonus === true
    const willUseReal = useReal !== false // default true unless explicitly false

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
    const currency = product.currency || 'USD'
    const isFC = currency === 'FC'

    // ─── Determine effective price ───────────────────────────────────
    const effectivePrice = willUseBonus && product.bonusPrice !== null && product.bonusPrice !== undefined
      ? product.bonusPrice
      : product.price

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
      const existingBonusPurchases = await db.purchase.count({
        where: {
          productId,
          buyerId,
          usedBonus: { gt: 0 },
        },
      })

      if (existingBonusPurchases >= product.bonusMaxQty) {
        return NextResponse.json(
          { success: false, message: `You have reached the maximum limit of ${product.bonusMaxQty} bonus purchases for this product` },
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

    // Deduct real balance atomically (race-condition safe)
    if (usedReal > 0) {
      const deductResult = await safeDeduct(buyerId, usedReal, currency)
      if (!deductResult.success) {
        return NextResponse.json({ success: false, message: deductResult.message }, { status: 400 })
      }
    }

    // Deduct bonus balance atomically (race-condition safe)
    if (usedBonus > 0) {
      const bonusField = isFC ? 'bonusBalanceFC' : 'bonusBalance'
      const bonusResult = await db.user.updateMany({
        where: { id: buyerId, [bonusField]: { gte: usedBonus } },
        data: { [bonusField]: { decrement: usedBonus } },
      })
      if (bonusResult.count === 0) {
        return NextResponse.json({ success: false, message: 'Bonus balance insufficient (concurrence)' }, { status: 400 })
      }
    }

    // ─── Atomic: create purchase, credit seller ──────────────────────
    const [purchase] = await db.$transaction([
      db.purchase.create({
        data: {
          productId,
          buyerId,
          amount: effectivePrice,
          usedBonus,
          usedReal,
          status: 'completed',
        },
        include: {
          product: true,
          buyer: { select: { id: true, name: true, pseudo: true } },
        },
      }),
      ...(product.sellerId
        ? [
            db.user.update({
              where: { id: product.sellerId },
              data: {
                [isFC ? 'realBalanceFC' : 'realBalance']: { increment: effectivePrice },
              },
            }),
          ]
        : []),
    ])

    // ─── Record bonus history if bonus was used ──────────────────────
    if (usedBonus > 0) {
      await db.bonusHistory.create({
        data: {
          userId: buyerId,
          type: 'purchase',
          amount: -usedBonus,
          currency,
          description: `Purchased "${product.name}" using bonus balance`,
          metadata: JSON.stringify({
            productId: product.id,
            productName: product.name,
            purchaseId: purchase.id,
            bonusUsed: usedBonus,
            realUsed: usedReal,
            totalPrice: effectivePrice,
          }),
        },
      })
    }

    // ─── Notify seller ───────────────────────────────────────────────
    if (product.sellerId) {
      await db.notification.create({
        data: {
          userId: product.sellerId,
          title: 'New Purchase',
          message: `${buyer.name || buyer.pseudo || 'Someone'} purchased "${product.name}" for ${effectivePrice.toFixed(2)} ${currency}${usedBonus > 0 ? ' (bonus payment)' : ''}`,
          type: 'purchase',
        },
      })
    }

    // ─── Notify buyer ───────────────────────────────────────────────
    await db.notification.create({
      data: {
        userId: buyer.id,
        title: 'Achat confirmé',
        message: `Votre achat de "${product.name}" pour ${effectivePrice.toFixed(2)} ${currency} a été confirmé. ${usedBonus > 0 ? `Bonus utilisé: ${usedBonus.toFixed(2)} USD.` : ''}`,
        type: 'purchase',
      },
    })

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

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        productId: purchase.productId,
        buyerId: purchase.buyerId,
        amount: purchase.amount,
        usedBonus: purchase.usedBonus,
        usedReal: purchase.usedReal,
        currency,
        status: purchase.status,
        createdAt: purchase.createdAt,
      },
    })
  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
