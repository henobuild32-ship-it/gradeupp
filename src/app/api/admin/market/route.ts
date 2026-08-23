import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      db.marketplaceProduct.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          seller: { select: { id: true, name: true, pseudo: true } },
        },
      }),
      db.marketplaceProduct.count(),
    ]);

    return NextResponse.json({ success: true, products, total, page, limit });
  } catch (error) {
    console.error('Admin market list error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json();
    const { action, productId, name, description, price, currency, category, imageUrl, bonusEnabled, bonusOnly, bonusPrice, bonusMaxQty, bonusExpiryAt } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action requise' },
        { status: 400 }
      );
    }

    // CREATE
    if (action === 'create') {
      if (!name || !price || !currency || !category) {
        return NextResponse.json(
          { success: false, message: 'Nom, prix, devise et catégorie requis' },
          { status: 400 }
        );
      }

      const product = await db.marketplaceProduct.create({
        data: {
          name: name.trim(),
          description: description?.trim() || '',
          price: parseFloat(price),
          currency,
          category,
          imageUrl: imageUrl?.trim() || null,
          active: true,
          bonusEnabled: bonusEnabled || false,
          bonusOnly: bonusOnly || false,
          bonusPrice: bonusPrice ? parseFloat(bonusPrice) : null,
          bonusMaxQty: bonusMaxQty ? parseInt(bonusMaxQty) : null,
          bonusExpiryAt: bonusExpiryAt ? new Date(bonusExpiryAt) : null,
        },
      });

      return NextResponse.json({ success: true, product });
    }

    // UPDATE
    if (action === 'update') {
      if (!productId) {
        return NextResponse.json(
          { success: false, message: 'productId requis pour la modification' },
          { status: 400 }
        );
      }

      const existing = await db.marketplaceProduct.findUnique({ where: { id: productId } });
      if (!existing) {
        return NextResponse.json(
          { success: false, message: 'Produit non trouvé' },
          { status: 404 }
        );
      }

      const product = await db.marketplaceProduct.update({
        where: { id: productId },
        data: {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description: description.trim() }),
          ...(price && { price: parseFloat(price) }),
          ...(currency && { currency }),
          ...(category && { category }),
          ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() || null }),
          ...(bonusEnabled !== undefined && { bonusEnabled }),
          ...(bonusOnly !== undefined && { bonusOnly }),
          ...(bonusPrice !== undefined && { bonusPrice: bonusPrice ? parseFloat(bonusPrice) : null }),
          ...(bonusMaxQty !== undefined && { bonusMaxQty: bonusMaxQty ? parseInt(bonusMaxQty) : null }),
          ...(bonusExpiryAt !== undefined && { bonusExpiryAt: bonusExpiryAt ? new Date(bonusExpiryAt) : null }),
        },
      });

      return NextResponse.json({ success: true, product });
    }

    // TOGGLE ACTIVE
    if (action === 'toggle') {
      if (!productId) {
        return NextResponse.json(
          { success: false, message: 'productId requis' },
          { status: 400 }
        );
      }

      const existing = await db.marketplaceProduct.findUnique({ where: { id: productId } });
      if (!existing) {
        return NextResponse.json(
          { success: false, message: 'Produit non trouvé' },
          { status: 404 }
        );
      }

      const product = await db.marketplaceProduct.update({
        where: { id: productId },
        data: { active: !existing.active },
      });

      return NextResponse.json({ success: true, product });
    }

    // DELETE
    if (action === 'delete') {
      if (!productId) {
        return NextResponse.json(
          { success: false, message: 'productId requis' },
          { status: 400 }
        );
      }

      await db.marketplaceProduct.delete({ where: { id: productId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, message: 'Action inconnue: ' + action },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin market action error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
