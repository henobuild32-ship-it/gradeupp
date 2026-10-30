import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clearTokenCookie, setTokenCookie, signLoginChallengeToken, signToken } from '@/lib/auth';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getCountry, normalizeInternationalPhone } from '@/lib/countries';
import { sanitizeSafeUser } from '@/lib/sanitize';
import { canUseGoogleIdentityForNewAccount, isGoogleAccountRole, missingGoogleProfileFields, shouldRequestGoogleProfile } from '@/lib/google-auth-policy';
import crypto from 'node:crypto';

type GoogleRole = 'client' | 'agent' | 'seller';
type GoogleMode = 'login' | 'register';

function needsProfile(email: string, displayName: string | null, photoURL: string | null) {
  return NextResponse.json({
    success: false,
    needsProfile: true,
    googleData: { email, displayName, photoURL, emailVerified: true },
  }, { status: 206 });
}

async function respondForUser(user: any, expectedRole: unknown, isNewUser: boolean) {
  if (user.deletedAt) {
    return NextResponse.json({ success: false, message: 'Ce compte n’est plus actif. Contactez le support TRAIT.' }, { status: 410 });
  }
  if (isGoogleAccountRole(expectedRole) && user.role !== expectedRole) {
    const roleLabel = user.role === 'agent' ? 'Agent' : user.role === 'seller' ? 'commerçant' : 'client';
    return NextResponse.json({ success: false, message: `Ce compte Google est associé à un compte ${roleLabel}. Choisissez le bon type de compte.` }, { status: 403 });
  }
  if (user.suspended || user.tempBlocked) {
    return NextResponse.json({ success: false, message: `Compte suspendu ou temporairement bloqué. ${user.suspensionReason || 'Contactez le support TRAIT.'}` }, { status: 403 });
  }
  if (user.role === 'agent' && user.validationStatus !== 'validated') {
    const reason = user.validationStatus === 'rejected'
      ? user.validationRejectReason || 'Votre demande Agent a été refusée.'
      : user.validationStatus === 'suspended'
        ? user.suspensionReason || 'Votre compte Agent est suspendu.'
        : 'Votre compte Agent est en attente de validation.';
    return NextResponse.json({ success: false, validationStatus: user.validationStatus, message: reason }, { status: 403 });
  }

  if (user.twoFactorEnabled) {
    const challengeToken = await signLoginChallengeToken({ userId: user.id, role: user.role });
    const response = NextResponse.json({ success: true, requiresTwoFactor: true, challengeToken });
    clearTokenCookie(response);
    return response;
  }

  const token = await signToken({ userId: user.id, role: user.role });
  const response = NextResponse.json({ success: true, isNewUser, user: sanitizeSafeUser(user) });
  setTokenCookie(response, token);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit({ windowMs: 60_000, maxRequests: 10, key: `google-auth:${ip}` });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetIn);

    const parsedBody = await request.json().catch(() => ({}));
    const body = parsedBody && typeof parsedBody === 'object' ? parsedBody : {};
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    const mode = body.mode as GoogleMode;
    const requestedRole = body.role;
    if (!idToken || idToken.length > 10_000 || (mode !== 'login' && mode !== 'register')) {
      return NextResponse.json({ success: false, message: 'Demande de connexion Google invalide.' }, { status: 400 });
    }
    if (requestedRole !== undefined && !isGoogleAccountRole(requestedRole)) {
      return NextResponse.json({ success: false, message: 'Type de compte invalide.' }, { status: 400 });
    }

    // The Firebase token, not client-supplied profile fields, is the identity proof.
    const firebaseUser = await verifyFirebaseIdToken(idToken);
    if (!firebaseUser) {
      return NextResponse.json({ success: false, message: 'Session Google invalide ou expirée. Recommencez.' }, { status: 401 });
    }
    const { uid, displayName, photoURL, emailVerified } = firebaseUser;
    const email = firebaseUser.email?.trim().toLowerCase() || '';

    let user = await db.user.findUnique({ where: { firebaseUid: uid } });
    if (!user && email && emailVerified) {
      const emailMatches = await db.user.findMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        take: 2,
      });
      if (emailMatches.length > 1) {
        return NextResponse.json({ success: false, message: 'Cette adresse correspond à plusieurs profils TRAIT. Contactez le support pour les sécuriser.' }, { status: 409 });
      }
      user = emailMatches[0] || null;
    }

    if (user) {
      if (user.deletedAt) return respondForUser(user, requestedRole, false);
      if (isGoogleAccountRole(requestedRole) && user.role !== requestedRole) {
        return respondForUser(user, requestedRole, false);
      }
      if (user.firebaseUid && user.firebaseUid !== uid) {
        return NextResponse.json({ success: false, message: 'Cette adresse est déjà liée à une autre identité Google.' }, { status: 409 });
      }
      if (!emailVerified && !user.firebaseUid) {
        return NextResponse.json({ success: false, message: 'Vérifiez d’abord votre adresse Google avant de l’associer à TRAIT.' }, { status: 403 });
      }

      if (!user.firebaseUid || (photoURL && !user.photoUrl) || (emailVerified && !user.isVerified)) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            ...(user.firebaseUid ? {} : { firebaseUid: uid }),
            authProvider: user.authProvider === 'local' ? 'google+local' : 'google',
            ...(photoURL && !user.photoUrl ? { photoUrl: photoURL } : {}),
            ...(emailVerified && !user.isVerified ? { isVerified: true } : {}),
          },
        });
      }
      return respondForUser(user, requestedRole, false);
    }

    // A new account is never created just by pressing “Google”. The authenticated
    // user is returned to the remaining-profile form for explicit completion.
    if (!canUseGoogleIdentityForNewAccount(email, emailVerified)) {
      return NextResponse.json({ success: false, message: 'Google doit fournir une adresse email vérifiée pour créer un compte TRAIT.' }, { status: 403 });
    }
    if (shouldRequestGoogleProfile(false) && (mode === 'login' || !body.phone || !body.country || !body.role || !body.name)) {
      return needsProfile(email, displayName, photoURL);
    }
    if (!isGoogleAccountRole(body.role)) {
      return NextResponse.json({ success: false, message: 'Type de compte invalide.' }, { status: 400 });
    }
    const role: GoogleRole = body.role;
    const missingFields = missingGoogleProfileFields(role, body);
    if (missingFields.length) {
      const firstField = missingFields[0];
      const message = firstField === 'acceptedTerms'
        ? 'Acceptez les conditions d’utilisation pour continuer.'
        : firstField === 'businessName' || firstField === 'businessType' || firstField === 'city' || firstField === 'location'
          ? 'Complétez les informations obligatoires de votre commerce.'
          : 'Complétez votre nom, votre téléphone et votre pays.';
      return NextResponse.json({ success: false, message }, { status: 400 });
    }

    const canonicalPhone = normalizeInternationalPhone(body.phone);
    const country = typeof body.country === 'string' ? body.country.toUpperCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!canonicalPhone || !country || !getCountry(country) || !name || name.length > 100) {
      return NextResponse.json({ success: false, message: 'Vérifiez votre nom, votre pays et votre numéro de téléphone.' }, { status: 400 });
    }

    const city = typeof body.city === 'string' ? body.city.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : '';
    const businessType = typeof body.businessType === 'string' ? body.businessType.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';
    if ([city, address, businessName, businessType, location].some((value) => value.length > 200)) {
      return NextResponse.json({ success: false, message: 'Un champ du profil dépasse la longueur autorisée.' }, { status: 400 });
    }
    let referrerCode: string | null = null;
    const submittedReferral = typeof body.referralCode === 'string' ? body.referralCode.trim().toUpperCase() : '';
    if (submittedReferral) {
      const referrer = await db.user.findUnique({ where: { referralCode: submittedReferral }, select: { id: true, deletedAt: true } });
      if (!referrer || referrer.deletedAt) return NextResponse.json({ success: false, message: 'Code de parrainage invalide.' }, { status: 400 });
      referrerCode = submittedReferral;
    }

    // Serialize first-time Google registrations and recheck identity/contact fields
    // inside the transaction so retries or concurrent submissions cannot create a
    // second profile for the same Google identity/email.
    const created = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(913748, 1)`;
      const byUid = await tx.user.findUnique({ where: { firebaseUid: uid } });
      if (byUid) return { user: byUid, created: false };

      const sameEmail = await tx.user.findMany({ where: { email: { equals: email, mode: 'insensitive' } }, take: 2 });
      if (sameEmail.length > 1) throw new Error('GOOGLE_EMAIL_AMBIGUOUS');
      if (sameEmail[0]) {
        if (sameEmail[0].deletedAt) throw new Error('GOOGLE_ACCOUNT_DELETED');
        if (sameEmail[0].firebaseUid && sameEmail[0].firebaseUid !== uid) throw new Error('GOOGLE_EMAIL_LINKED');
        if (sameEmail[0].role !== role) throw new Error('GOOGLE_ROLE_MISMATCH');
        const linked = await tx.user.update({
          where: { id: sameEmail[0].id },
          data: {
            ...(sameEmail[0].firebaseUid ? {} : { firebaseUid: uid }),
            authProvider: sameEmail[0].authProvider === 'local' ? 'google+local' : 'google',
            ...(photoURL && !sameEmail[0].photoUrl ? { photoUrl: photoURL } : {}),
            ...(emailVerified && !sameEmail[0].isVerified ? { isVerified: true } : {}),
          },
        });
        return { user: linked, created: false };
      }

      const samePhone = await tx.user.findUnique({ where: { phone: canonicalPhone } });
      if (samePhone) throw new Error('GOOGLE_PHONE_ALREADY_USED');

      let referralCode: string;
      do {
        referralCode = crypto.randomBytes(5).toString('hex').toUpperCase();
      } while (await tx.user.findUnique({ where: { referralCode } }));

      const userDisplayName = name || displayName || email.split('@')[0] || 'Utilisateur';
      const newUser = await tx.user.create({
        data: {
          phone: canonicalPhone,
          name: userDisplayName,
          pseudo: userDisplayName.split(' ')[0] || userDisplayName,
          email,
          country,
          city: city || null,
          address: address || null,
          businessName: role === 'seller' ? businessName : null,
          businessType: role === 'seller' ? businessType : null,
          location: role === 'seller' ? location : null,
          role,
          firebaseUid: uid,
          authProvider: 'google',
          photoUrl: photoURL || null,
          password: null,
          isVerified: true,
          realBalance: 0,
          realBalanceFC: 0,
          bonusBalance: 0,
          bonusBalanceFC: 0,
          validationStatus: role === 'client' ? 'validated' : 'pending',
          referralCode,
          referredBy: referrerCode,
        },
      });
      return { user: newUser, created: true };
    });

    if (!created.created && isGoogleAccountRole(requestedRole) && created.user.role !== requestedRole) {
      return NextResponse.json({ success: false, message: 'Cette adresse est déjà associée à un autre type de compte TRAIT.' }, { status: 403 });
    }
    return respondForUser(created.user, requestedRole, created.created);
  } catch (error: any) {
    const code = typeof error?.message === 'string' ? error.message : '';
    if (code === 'GOOGLE_EMAIL_AMBIGUOUS') return NextResponse.json({ success: false, message: 'Cette adresse correspond à plusieurs profils TRAIT. Contactez le support.' }, { status: 409 });
    if (code === 'GOOGLE_EMAIL_LINKED') return NextResponse.json({ success: false, message: 'Cette adresse est déjà liée à une autre identité Google.' }, { status: 409 });
    if (code === 'GOOGLE_ACCOUNT_DELETED') return NextResponse.json({ success: false, message: 'Ce compte n’est plus actif. Contactez le support TRAIT.' }, { status: 410 });
    if (code === 'GOOGLE_ROLE_MISMATCH') return NextResponse.json({ success: false, message: 'Cette adresse est déjà associée à un autre type de compte TRAIT.' }, { status: 403 });
    if (code === 'GOOGLE_PHONE_ALREADY_USED' || error?.code === 'P2002') return NextResponse.json({ success: false, message: 'Ce numéro ou cette identité est déjà associé à un compte TRAIT.' }, { status: 409 });
    console.error('Google authentication failed:', error?.code || 'UNKNOWN');
    return NextResponse.json({ success: false, message: 'Connexion Google momentanément impossible. Réessayez.' }, { status: 500 });
  }
}
