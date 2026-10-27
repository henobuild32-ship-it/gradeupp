import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

// POST - Client requests a card
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const rateLimit = checkRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3, key: `card-request:${auth.userId}` });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetIn);
    const { userId, cardType, holderName, jobTitle, birthDate, photoData } = await request.json() as {
      userId: string;
      cardType: 'USD' | 'FC';
      holderName: string;
      jobTitle: string;
      birthDate: string;
      photoData: string;
    };

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId est requis' },
        { status: 400 }
      );
    }

    if (auth.userId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      );
    }

    if (!cardType || !['USD', 'FC'].includes(cardType)) {
      return NextResponse.json(
        { success: false, message: 'cardType doit être "USD" ou "FC"' },
        { status: 400 }
      );
    }

    const safeName = typeof holderName === 'string' ? holderName.trim().replace(/\s+/g, ' ').slice(0, 100) : '';
    const safeJobTitle = typeof jobTitle === 'string' ? jobTitle.trim().replace(/\s+/g, ' ').slice(0, 60) : '';
    const parsedBirthDate = typeof birthDate === 'string' ? new Date(`${birthDate}T00:00:00.000Z`) : null;
    if (!safeName || safeName.length < 2 || !safeJobTitle || !parsedBirthDate || Number.isNaN(parsedBirthDate.getTime()) || parsedBirthDate >= new Date()) {
      return NextResponse.json({ success: false, message: 'Nom, poste et date de naissance valide sont requis' }, { status: 400 });
    }
    if (typeof photoData !== 'string' || photoData.length > 1_500_000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photoData)) {
      return NextResponse.json({ success: false, message: 'Ajoutez une photo JPEG, PNG ou WebP de moins de 1 Mo' }, { status: 400 });
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    if (user.suspended) {
      return NextResponse.json(
        { success: false, message: 'Votre compte est suspendu' },
        { status: 403 }
      );
    }

    // Check if user already has a card of that type
    const existingCard = await db.traitCard.findFirst({
      where: { userId, cardType, status: { not: 'blocked' } },
    });

    if (existingCard) {
      return NextResponse.json(
        { success: false, message: `Vous possédez déjà une carte ${cardType}` },
        { status: 400 }
      );
    }

    // Check if user already has a pending request for that type
    const existingRequest = await db.cardRequest.findFirst({
      where: { userId, cardType, status: 'pending' },
    });

    if (existingRequest) {
      return NextResponse.json(
        { success: false, message: `Vous avez déjà une demande de carte ${cardType} en attente` },
        { status: 400 }
      );
    }

    // Create the card request
    const cardRequest = await db.cardRequest.create({
      data: {
        userId,
        cardType,
        status: 'pending',
        holderName: safeName,
        jobTitle: safeJobTitle,
        birthDate: parsedBirthDate,
        photoData,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Demande de carte soumise avec succès',
      cardRequest: {
        id: cardRequest.id,
        cardType: cardRequest.cardType,
        status: cardRequest.status,
        createdAt: cardRequest.createdAt,
      },
    });
  } catch (error) {
    console.error('Card request error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
