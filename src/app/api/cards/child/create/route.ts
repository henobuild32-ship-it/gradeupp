import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logSecurityEvent } from '@/lib/security';
import { requireUser, hashPin, hashPassword } from '@/lib/auth';
import { randomInt, randomBytes, randomUUID } from 'crypto';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createNotification } from '@/lib/notifications';
import { CARD_LOAD_CAP, formatLoadCap, type CardRelation } from '@/lib/family-card';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const rateLimit = checkRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5, key: `family-card-create:${auth.userId}` });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetIn);
    const body = await request.json();
    const { parentId, childName, cardType, pin, relation, jobTitle, birthDate, photoData } = body as {
      parentId: string;
      childName: string;
      cardType: 'USD' | 'FC';
      pin?: string;
      relation?: CardRelation;
      jobTitle?: string;
      birthDate?: string;
      photoData?: string;
    };

    const cardRelation: CardRelation = relation === 'family' ? 'family' : 'child';
    const holderLabel = cardRelation === 'family' ? 'du membre' : "de l'enfant";

    if (!parentId || !childName || !cardType) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants: parentId, childName et cardType sont requis' },
        { status: 400 }
      );
    }

    if (cardType !== 'USD' && cardType !== 'FC') {
      return NextResponse.json(
        { success: false, message: 'Devise invalide : choisissez USD ou CDF' },
        { status: 400 }
      );
    }

    if (auth.userId !== parentId) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 403 }
      );
    }

    const trimmedName = childName.trim();
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmedName)) {
      return NextResponse.json(
        { success: false, message: `Le nom ${holderLabel} ne doit contenir que des lettres` },
        { status: 400 }
      );
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, message: `Le PIN ${holderLabel} est obligatoire et doit contenir exactement 4 chiffres` },
        { status: 400 }
      );
    }

    const parsedBirthDate = birthDate ? new Date(`${birthDate}T00:00:00.000Z`) : null;
    if (!parsedBirthDate || Number.isNaN(parsedBirthDate.getTime()) || parsedBirthDate >= new Date()) {
      return NextResponse.json({ success: false, message: 'Une date de naissance valide est requise' }, { status: 400 });
    }
    const trimmedJobTitle = typeof jobTitle === 'string' ? jobTitle.trim().slice(0, 60) : '';
    if (!trimmedJobTitle) return NextResponse.json({ success: false, message: 'Le poste ou rôle est requis' }, { status: 400 });
    if (typeof photoData !== 'string' || photoData.length > 1_500_000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photoData)) {
      return NextResponse.json({ success: false, message: 'Ajoutez une photo JPEG, PNG ou WebP de moins de 1 Mo' }, { status: 400 });
    }

    // Verify parent exists
    const parent = await db.user.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      return NextResponse.json(
        { success: false, message: 'Parent non trouvé' },
        { status: 404 }
      );
    }

    // Generate a unique virtual phone number for the child
    let childPhone = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 50) {
      const randomDigits = randomInt(10000000, 100000000).toString();
      childPhone = `+24388${randomDigits}`;
      const existing = await db.user.findUnique({ where: { phone: childPhone } });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la génération du numéro pour l\'enfant' },
        { status: 500 }
      );
    }

    // Generate unique pseudo
    const pseudo = `${childName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30) || 'membre'}_${randomInt(100, 1000)}`;

    // Create child user
    const child = await db.user.create({
      data: {
        phone: childPhone,
        name: trimmedName,
        pseudo,
        country: parent.country || 'CD',
        role: 'client', // child is a client for compatibility
        pin: await hashPin(pin),
        password: await hashPassword(randomBytes(32).toString('base64url')),
        realBalance: 0,
        realBalanceFC: 0,
        bonusBalance: 0, // 0 as required
        bonusBalanceFC: 0,
        parentId,
        isVerified: true,
        hasCompletedOnboarding: true,
      },
    });

    const maxLoadAmount = CARD_LOAD_CAP[cardType === 'FC' ? 'FC' : 'USD'];

    // Create a reviewable request and a non-payable preview; no bank credentials are generated.
    const cardRequest = await db.cardRequest.create({
      data: {
        userId: child.id,
        cardType,
        status: 'pending',
        holderName: trimmedName,
        jobTitle: trimmedJobTitle,
        birthDate: parsedBirthDate,
        photoData,
      },
    });

    const card = await db.traitCard.create({
      data: {
        userId: child.id,
        cardRequestId: cardRequest.id,
        cardType,
        qrCode: randomUUID(),
        status: 'pending_retrieval', // En attente de retrait
        holderName: trimmedName,
        jobTitle: trimmedJobTitle,
        birthDate: parsedBirthDate,
        holderPhoto: photoData,
        relation: cardRelation,
        maxLoadAmount,
      },
    });

    // Log the creation
    await logSecurityEvent({
      userId: parentId,
      action: cardRelation === 'family' ? 'family_card_created' : 'child_account_created',
      details: JSON.stringify({
        childId: child.id,
        childName,
        childPhone,
        cardId: card.id,
        cardType,
        relation: cardRelation,
        maxLoadAmount,
      }),
      riskLevel: 'low',
    });

    // Notification for parent
    await createNotification(
      parentId,
      cardRelation === 'family' ? 'Carte Famille créée' : 'Compte Enfant créé',
      cardRelation === 'family'
        ? `La carte TRAIT ${cardType} de ${childName} (membre de votre famille) a été créée. Plafond d'encaissement : ${formatLoadCap(cardType === 'FC' ? 'FC' : 'USD')}.`
        : `Le compte de votre enfant ${childName} a été créé et sa demande est en attente de validation administrative. Vous pouvez déjà consulter l'aperçu. Plafond d'encaissement : ${formatLoadCap(cardType === 'FC' ? 'FC' : 'USD')}.`,
      'general',
      false
    )

    // Message/Notification for child
    await createNotification(
      child.id,
      'Bienvenue sur TRAIT',
      cardRelation === 'family'
        ? `Votre compte TRAIT a été créé par un membre de votre famille. Votre carte ${cardType} est prête !`
        : `Ton compte enfant a été configuré par ton parent. Ta carte TRAIT ${cardType} est prête !`,
      'general',
      false
    )

    const capLabel = formatLoadCap(cardType === 'FC' ? 'FC' : 'USD');
    const successMessage = cardRelation === 'family'
      ? `Félicitations ! La carte TRAIT ${cardType} de ${childName} (membre de votre famille) a été créée avec succès.

Plafond d'encaissement de la carte : ${capLabel}.

La demande attend la validation de l'administration. Vous pourrez retirer la carte physique après validation.

L'aperçu est disponible dans votre espace. La carte sera activée après sa remise.`
      : `Félicitations ! La carte TRAIT de ${childName} a été créée avec succès.

Plafond d'encaissement de la carte : ${capLabel}.

La demande attend la validation de l'administration. Vous pourrez retirer la carte physique de votre enfant après validation.

L'aperçu est disponible dans votre espace. La carte sera activée après sa remise.`;

    return NextResponse.json({
      success: true,
      message: successMessage,
      child: {
        id: child.id,
        name: child.name,
        phone: child.phone,
      },
      card: {
        id: card.id,
        cardType: card.cardType,
        cardNumber: null,
        last4: null,
        status: card.status,
        relation: card.relation,
        maxLoadAmount: card.maxLoadAmount,
      },
    });
  } catch (error) {
    console.error('Create child account error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la création du compte enfant' },
      { status: 500 }
    );
  }
}
