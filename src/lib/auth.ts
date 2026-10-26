import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { createHmac } from 'node:crypto';
import { db } from '@/lib/db';

const secret = process.env.JWT_SECRET
const SECRET = secret ? new TextEncoder().encode(secret) : null

const TOKEN_COOKIE = 'trait_token';
const ADMIN_TOKEN_COOKIE = 'trait_admin_token';

function getSecret() {
  if (!SECRET) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return SECRET
}

export async function signToken(payload: { userId: string; role: string }) {
  const enc = getSecret()
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(enc);
}

export async function verifyToken(token: string) {
  try {
    const enc = getSecret()
    const { payload } = await jwtVerify(token, enc);
    return payload as { userId: string; role: string };
  } catch {
    return null;
  }
}

function getLoginChallengeSecret() {
  return createHmac('sha256', getSecret()).update('trait:login-2fa:v1').digest();
}

export async function signLoginChallengeToken(payload: { userId: string; role: string }) {
  return new SignJWT({ ...payload, purpose: 'login-2fa' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('trait')
    .setAudience('trait-login-2fa')
    .setExpirationTime('5m')
    .setIssuedAt()
    .sign(getLoginChallengeSecret());
}

export async function verifyLoginChallengeToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getLoginChallengeSecret(), {
      issuer: 'trait',
      audience: 'trait-login-2fa',
    });
    if (payload.purpose !== 'login-2fa' || typeof payload.userId !== 'string' || typeof payload.role !== 'string') {
      return null;
    }
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export function setTokenCookie(response: NextResponse, token: string, isAdmin = false) {
  response.cookies.set(isAdmin ? ADMIN_TOKEN_COOKIE : TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function clearTokenCookie(response: NextResponse, isAdmin = false) {
  response.cookies.set(isAdmin ? ADMIN_TOKEN_COOKIE : TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

function isBcryptHash(str: string): boolean {
  return str.startsWith('$2')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyAndMigratePassword(
  userId: string,
  inputPassword: string,
  storedPassword: string | null
): Promise<boolean> {
  if (!storedPassword) return false;
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(inputPassword, storedPassword);
  }
  if (storedPassword === inputPassword) {
    const hashed = await hashPassword(inputPassword);
    await db.user.update({
      where: { id: userId },
      data: { password: hashed },
    }).catch(() => {});
    return true;
  }
  return false;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyAndMigratePin(
  userId: string,
  inputPin: string,
  storedPin: string | null
): Promise<boolean> {
  if (!storedPin) return false;
  if (isBcryptHash(storedPin)) {
    return bcrypt.compare(inputPin, storedPin);
  }
  if (storedPin === inputPin) {
    const hashed = await hashPin(inputPin);
    await db.user.update({
      where: { id: userId },
      data: { pin: hashed },
    }).catch(() => {});
    return true;
  }
  return false;
}

export async function verifyPinWithAttempts(userId: string, inputPin: string): Promise<{ valid: boolean; blocked: boolean; attempts: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, pin: true, pinAttempts: true, tempBlocked: true },
  });
  if (!user || !user.pin || user.tempBlocked) return { valid: false, blocked: !!user?.tempBlocked, attempts: user?.pinAttempts ?? 0 };

  if (await verifyAndMigratePin(user.id, inputPin, user.pin)) {
    if (user.pinAttempts > 0) {
      await db.user.update({ where: { id: userId }, data: { pinAttempts: 0 } });
    }
    return { valid: true, blocked: false, attempts: 0 };
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { pinAttempts: { increment: 1 } },
    select: { pinAttempts: true },
  });
  if (updated.pinAttempts >= 5) {
    await db.user.update({
      where: { id: userId },
      data: { pinAttempts: 0, tempBlocked: true },
    });
    return { valid: false, blocked: true, attempts: 0 };
  }
  return { valid: false, blocked: false, attempts: updated.pinAttempts };
}

async function resolveAuthFromRequest(request: NextRequest, cookieName: string) {
  const cookieToken = request.cookies.get(cookieName)?.value
  const headerToken = request.headers.get('Authorization')?.replace('Bearer ', '') || null

  if (cookieToken) {
    const payload = await verifyToken(cookieToken)
    if (payload) return payload
  }
  if (headerToken) {
    const payload = await verifyToken(headerToken)
    if (payload) return payload
  }
  return null
}

export async function requireUser(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(TOKEN_COOKIE)?.value
    const headerToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!cookieToken && !headerToken) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }
    const payload = await resolveAuthFromRequest(request, TOKEN_COOKIE)
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Session invalide' }, { status: 401 })
    }
    return payload
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erreur d\'authentification' }, { status: 500 })
  }
}

export async function requireAdmin(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value
    const headerToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!cookieToken && !headerToken) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 })
    }
    const payload = await resolveAuthFromRequest(request, ADMIN_TOKEN_COOKIE)
    if (!payload || !['admin', 'super_admin'].includes(payload.role)) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 })
    }
    const currentAdmin = await db.admin.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    })
    if (!currentAdmin || !['admin', 'super_admin'].includes(currentAdmin.role)) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 })
    }
    return { userId: currentAdmin.id, role: currentAdmin.role }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erreur d\'authentification' }, { status: 500 })
  }
}

export async function getAuthUser(request: NextRequest) {
  try {
    const payload = await resolveAuthFromRequest(request, TOKEN_COOKIE)
    return payload || null
  } catch {
    return null
  }
}
