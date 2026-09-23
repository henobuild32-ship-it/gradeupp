import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const securityHeaders: Record<string, string> = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-Permitted-Cross-Domain-Policies': 'none',
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }

  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://*.gstatic.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.googleusercontent.com https://*.firebaseapp.com",
    "font-src 'self'",
    "connect-src 'self' https://open.bigmodel.cn https://*.vercel.app wss://*.vercel.app https://*.firebaseapp.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://accounts.google.com https://apis.google.com https://www.gstatic.com https://*.gstatic.com",
    "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://*.google.com",
    "frame-ancestors 'self'",
    "worker-src 'self' blob:",
  ].join('; '))

  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host') || ''
    const allowedExact = new Set([
      'https://trait-rho.vercel.app',
      'http://localhost:3000',
      'http://localhost:3099',
    ])

    function isAllowedOrigin(o: string | null): boolean {
      if (!o) return true
      if (allowedExact.has(o)) return true
      try {
        const u = new URL(o)
        if (u.host === host) return true
        if (u.hostname.endsWith('.vercel.app') && u.hostname.includes('trait')) return true
        if (u.hostname.endsWith('.vercel.app') && u.hostname.includes('henobuild')) return true
      } catch {}
      return false
    }

    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { success: false, message: 'Origin not allowed' },
        { status: 403 }
      )
    }

    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/app/version')) {
    const sensitiveEndpoints = ['/api/auth/register', '/api/auth/send-otp', '/api/auth/forgot-password', '/api/admin/login']
    const isSensitive = sensitiveEndpoints.some(ep => pathname.startsWith(ep))

    if (isSensitive) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
    }
  }

  if (pathname === '/sw.js' || pathname.startsWith('/sw-')) {
    response.headers.set('Service-Worker-Allowed', '/')
    response.headers.set('Cache-Control', 'no-cache')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt).*)',
  ],
}
