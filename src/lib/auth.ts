import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
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
    .setExpirationTime('7d')
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

export function setTokenCookie(response: NextResponse, token: string, isAdmin = false) {
  response.cookies.set(isAdmin ? ADMIN_TOKEN_COOKIE : TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
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

export async function requireUser(request: NextRequest) {
  try {
    const token = request.cookies.get(TOKEN_COOKIE)?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Session invalide' }, { status: 401 });
    }
    return payload;
  } catch (error) {
    console.error('requireUser error:', error);
    return NextResponse.json({ success: false, message: 'Erreur d\'authentification' }, { status: 500 });
  }
}

export async function requireAdmin(request: NextRequest) {
  try {
    const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload || payload.role === 'user') {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
    }
    return payload;
  } catch (error) {
    console.error('requireAdmin error:', error);
    return NextResponse.json({ success: false, message: 'Erreur d\'authentification' }, { status: 500 });
  }
}

export async function getAuthUser(request: NextRequest) {
  try {
    const token = request.cookies.get(TOKEN_COOKIE)?.value || request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return null
    const payload = await verifyToken(token)
    return payload || null
  } catch {
    return null
  }
}
