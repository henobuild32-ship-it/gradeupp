import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, setTokenCookie } from '@/lib/auth';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';
import crypto from 'crypto';

// POST /api/auth/google
// Body: { idToken: string, mode: 'login' | 'register', phone?: string, country?: string, role?: string, referralCode?: string }
// Verifies Firebase ID token server-side, finds/creates user in DB.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, mode, phone, country, role, referralCode } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ success: false, message: 'Token manquant' }, { status: 400 });
    }

    // Verify Firebase ID token server-side — NEVER trust client-sent uid
    const firebaseUser = await verifyFirebaseIdToken(idToken);
    if (!firebaseUser) {
      return NextResponse.json({ success: false, message: 'Token Firebase invalide' }, { status: 401 });
    }

    const { uid, email, displayName, photoURL, emailVerified } = firebaseUser;

    // ── Find existing user by firebaseUid OR email ──
    let user = await db.user.findFirst({
      where: {
        OR: [
          { firebaseUid: uid },
          ...(email ? [{ email: email.toLowerCase() }] : []),
        ],
      },
    });

    // ── EXISTING USER: login directly ──
    if (user) {
      // Link firebaseUid if not yet linked (account existed with same email)
      if (!user.firebaseUid || user.firebaseUid !== uid) {
        // Check no other user has this firebaseUid
        const conflict = await db.user.findUnique({ where: { firebaseUid: uid } });
        if (conflict && conflict.id !== user.id) {
          return NextResponse.json(
            { success: false, message: 'Ce compte Google est déjà lié à un autre compte.' },
            { status: 409 }
          );
        }
        user = await db.user.update({
          where: { id: user.id },
          data: {
            firebaseUid: uid,
            authProvider: user.authProvider === 'local' ? 'google+local' : 'google',
            ...(photoURL && !user.photoUrl ? { photoUrl: photoURL } : {}),
            ...(emailVerified && !user.isVerified ? { isVerified: true } : {}),
          },
        });
      }

      if (user.suspended) {
        return NextResponse.json(
          { success: false, message: `Compte suspendu. Motif: ${user.suspensionReason || 'Non précisé'}` },
          { status: 403 }
        );
      }

      if (user.role === 'agent') {
        if (user.validationStatus === 'pending') {
          return NextResponse.json(
            { success: false, validationStatus: 'pending', message: 'Votre compte Agent est en attente de validation.' },
            { status: 403 }
          );
        }
        if (user.validationStatus === 'rejected') {
          return NextResponse.json(
            { success: false, validationStatus: 'rejected', message: user.validationRejectReason || 'Demande refusée' },
            { status: 403 }
          );
        }
        if (user.suspended || user.validationStatus === 'suspended') {
          return NextResponse.json(
            { success: false, validationStatus: 'suspended', message: user.suspensionReason || 'Compte suspendu' },
            { status: 403 }
          );
        }
      }

      const token = await signToken({ userId: user.id, role: user.role });

      const response = NextResponse.json({
        success: true,
        isNewUser: false,
        token,
        user: sanitizeUser(user),
      });
      setTokenCookie(response, token);
      return response;
    }

    // ── NEW USER ──
    if (mode !== 'register') {
      // Login mode but no account exists
      return NextResponse.json(
        { success: false, message: 'Aucun compte trouvé avec cette adresse email. Créez un compte.' },
        { status: 404 }
      );
    }

    // Registration requires phone (TRAIT-specific, NOT from Google)
    if (!phone || typeof phone !== 'string' || phone.replace(/\D/g, '').length < 6) {
      return NextResponse.json(
        { success: false, needsProfile: true, googleData: { email, displayName, photoURL, emailVerified } },
        { status: 206 } // Partial content: need more profile fields
      );
    }

    if (!role || !['client', 'agent', 'seller'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Rôle invalide' },
        { status: 400 }
      );
    }

    // Check phone uniqueness
    const existingPhone = await db.user.findUnique({ where: { phone: phone.trim() } });
    if (existingPhone) {
      return NextResponse.json(
        { success: false, message: 'Ce numéro de téléphone est déjà enregistré' },
        { status: 409 }
      );
    }

    // Check email uniqueness
    if (email) {
      const existingEmail = await db.user.findFirst({
        where: { email: email.toLowerCase() },
      });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Cette adresse email est déjà utilisée avec une autre méthode de connexion.' },
          { status: 409 }
        );
      }
    }

    // Validate referral code
    let referrerCode: string | undefined;
    if (referralCode && referralCode.trim()) {
      const referrer = await db.user.findUnique({
        where: { referralCode: referralCode.trim().toUpperCase() },
      });
      if (!referrer) {
        return NextResponse.json({ success: false, message: 'Code de parrainage invalide' }, { status: 400 });
      }
      referrerCode = referralCode.trim().toUpperCase();
    }

    // Generate unique referral code
    let userReferralCode: string;
    do {
      userReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    } while (await db.user.findUnique({ where: { referralCode: userReferralCode } }));

    const isAgent = role === 'agent';
    const userDisplayName = displayName || email?.split('@')[0] || 'Utilisateur';
    const pseudo = userDisplayName.split(' ')[0] || userDisplayName;

    const newUser = await db.user.create({
      data: {
        phone: phone.trim(),
        name: userDisplayName,
        pseudo,
        email: email?.toLowerCase() || null,
        country: country || 'CD',
        role,
        firebaseUid: uid,
        authProvider: 'google',
        photoUrl: photoURL || null,
        password: null, // No local password for Google-only accounts
        isVerified: emailVerified || false,
        realBalance: isAgent || role === 'seller' ? 0 : 30,
        realBalanceFC: 0,
        bonusBalance: 0,
        bonusBalanceFC: 0,
        validationStatus: isAgent || role === 'seller' ? 'pending' : 'validated',
        referralCode: userReferralCode,
        referredBy: referrerCode,
      },
    });

    const token = await signToken({ userId: newUser.id, role: newUser.role });

    const response = NextResponse.json({
      success: true,
      isNewUser: true,
      token,
      user: sanitizeUser(newUser),
    });
    setTokenCookie(response, token);
    return response;
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur d\'authentification Google' },
      { status: 500 }
    );
  }
}

function sanitizeUser(user: any) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    pseudo: user.pseudo,
    email: user.email,
    gender: user.gender,
    city: user.city,
    country: user.country,
    role: user.role,
    agentCode: user.agentCode,
    agentNumber: user.agentNumber,
    validationStatus: user.validationStatus,
    validationRejectReason: user.validationRejectReason,
    realBalance: user.realBalance,
    realBalanceFC: user.realBalanceFC,
    bonusBalance: user.bonusBalance,
    bonusBalanceFC: user.bonusBalanceFC,
    isVerified: user.isVerified,
    parentId: user.parentId,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    twoFactorEnabled: user.twoFactorEnabled,
    referralCode: user.referralCode,
    photoUrl: user.photoUrl,
    authProvider: user.authProvider,
  };
}
