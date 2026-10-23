import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logSecurityEvent } from '@/lib/security';
import { requireUser, hashPin } from '@/lib/auth';
import { randomInt, randomBytes } from 'crypto';
import { createNotification } from '@/lib/notifications';
import { CARD_LOAD_CAP, formatLoadCap, type CardRelation } from '@/lib/family-card';

function maskCardNumber(num: string): string {
  return num.length >= 4 ? `****${num.slice(-4)}` : num;
}

function generateCardNumber(): string {
  const prefix = '4927';
  let remaining = '';
  for (let i = 0; i < 12; i++) {
    remaining += randomInt(0, 10).toString();
  }
  return prefix + remaining;
}

function generateCVV(): string {
  let cvv = '';
  for (let i = 0; i < 3; i++) {
    cvv += randomInt(0, 10).toString();
  }
  return cvv;
}

function generateExpiryDate(): string {
  const now = new Date();
  const expiry = new Date(now.getFullYear() + 3, now.getMonth(), 1);
  const month = (expiry.getMonth() + 1).toString().padStart(2, '0');
  const year = expiry.getFullYear().toString().slice(-2);
  return `${month}/${year}`;
}

function generateQRCode(cardId: string): string {
  return `TRAIT-QR-${cardId}-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const { parentId, childName, cardType, pin, relation } = body as {
      parentId: string;
      childName: string;
      cardType: 'USD' | 'FC';
      pin?: string;
      relation?: CardRelation;
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
      const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
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
    const pseudo = `${childName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.floor(100 + Math.random() * 900)}`;

    // Create child user
    const child = await db.user.create({
      data: {
        phone: childPhone,
        name: trimmedName,
        pseudo,
        country: parent.country || 'CD',
        role: 'client', // child is a client for compatibility
        pin: await hashPin(pin),
        password: parent.password || '1234', // default password or parent password
        realBalance: 0,
        realBalanceFC: 0,
        bonusBalance: 0, // 0 as required
        bonusBalanceFC: 0,
        parentId,
        isVerified: true,
        hasCompletedOnboarding: true,
      },
    });

    // Generate unique card details
    let cardNumber = generateCardNumber();
    let cardAttempts = 0;
    while (await db.traitCard.findUnique({ where: { cardNumber } }) && cardAttempts < 10) {
      cardNumber = generateCardNumber();
      cardAttempts++;
    }

    const cvv = generateCVV();
    const expiryDate = generateExpiryDate();
    const maxLoadAmount = CARD_LOAD_CAP[cardType === 'FC' ? 'FC' : 'USD'];

    // Create CardRequest + TraitCard
    const cardRequest = await db.cardRequest.create({
      data: {
        userId: child.id,
        cardType,
        status: 'approved',
      },
    });

    const card = await db.traitCard.create({
      data: {
        userId: child.id,
        cardRequestId: cardRequest.id,
        cardType,
        cardNumber,
        cvv,
        qrCode: generateQRCode(cardRequest.id),
        expiryDate,
        status: 'pending_retrieval', // En attente de retrait
        holderName: trimmedName,
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
        cardNumber: maskCardNumber(cardNumber),
      }),
      riskLevel: 'low',
    });

    // Notification for parent
    await createNotification(
      parentId,
      cardRelation === 'family' ? 'Carte Famille créée' : 'Compte Enfant créé',
      cardRelation === 'family'
        ? `La carte TRAIT ${cardType} de ${childName} (membre de votre famille) a été créée. Plafond d'encaissement : ${formatLoadCap(cardType === 'FC' ? 'FC' : 'USD')}.`
        : `Le compte de votre enfant ${childName} a été créé avec succès avec la carte ${cardType} ****${cardNumber.slice(-4)}. Plafond d'encaissement : ${formatLoadCap(cardType === 'FC' ? 'FC' : 'USD')}.`,
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

Rendez-vous à l'administration TRAIT pour récupérer la carte physique.

La carte est actuellement active avec un solde de 0 USD et 0 CDF. Vous pouvez commencer à l'utiliser après l'avoir rechargée.`
      : `Félicitations ! La carte TRAIT de ${childName} a été créée avec succès.

Plafond d'encaissement de la carte : ${capLabel}.

Rendez-vous à l'administration TRAIT pour récupérer la carte physique de votre enfant.

La carte est actuellement active avec un solde de 0 USD et 0 CDF. Vous pouvez commencer à l'utiliser après l'avoir rechargée.`;

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
        cardNumber: maskCardNumber(card.cardNumber),
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
