import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';

/**
 * GET /api/cards/reveal?cardId=...
 *
 * Révélation sécurisée des détails de carte (après PIN / biométrie côté client).
 *
 * ⚠️ IMPLÉMENTATION SPÉCIMEN
 * - Ne renvoie JAMAIS un PAN/CVV réel inventé.
 * - En production : déléguer au SDK / portefeuille sécurisé de l'ÉMETTEUR
 *   (panneau issuer, session éphémère ≤ 30 s, ou provisionnement Apple/Google Pay).
 * - L'app ne doit pas stocker le PAN complet ni le CVV (PCI DSS — hors scope lourd
 *   si l'émetteur affiche les données et Trait ne les touche jamais).
 *
 * Champs issuer : [À CONFIRMER AVEC LA DOC ÉMETTEUR]
 *   - nom exact du champ PAN (pan / primaryAccountNumber / …)
 *   - format expiration (MM/YY vs MM/YYYY)
 *   - disponibilité du CVV en ligne (souvent interdite hors 3DS)
 *   - mécanisme de session éphémère (jti, ttl, signature)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');

    if (!cardId) {
      return NextResponse.json(
        { success: false, message: 'cardId requis' },
        { status: 400 }
      );
    }

    const card = await db.traitCard.findUnique({ where: { id: cardId } });
    if (!card || card.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Carte non trouvée' },
        { status: 404 }
      );
    }

    if (card.status === 'blocked') {
      return NextResponse.json(
        { success: false, message: 'Carte bloquée — révélation impossible' },
        { status: 403 }
      );
    }

    await logSecurityEvent({
      userId: auth.userId,
      action: 'card_reveal',
      details: JSON.stringify({ cardId: card.id }),
      riskLevel: 'medium',
    });

    // SPÉCIMEN : jamais de données réelles hors émetteur
    return NextResponse.json({
      success: true,
      mode: 'specimen',
      last4: String(card.cardNumber || '').slice(-4),
      // En live, remplacer par un jeton de session issuer (ttl ≤ 30 s) :
      // issuerSession: { /* [À CONFIRMER AVEC L'ÉMETTEUR] */ },
      pan: null,
      expiry: null,
      cvv: null,
      message:
        'Mode spécimen — en production, les détails viennent du SDK émetteur (jamais stockés par Trait).',
      expiresInSec: 30,
    });
  } catch (error) {
    console.error('Card reveal error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
