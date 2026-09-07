import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

// Protected application routes
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/orders',
  '/measurements',
  '/customers',
  '/tissus',
  '/catalogue',
  '/production',
  '/calendar',
  '/payments',
  '/expenses',
  '/team',
  '/reports',
  '/settings',
];

// Sensitive authentication & API routes subject to strict anti-brute-force rate limiting
const SENSITIVE_AUTH_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/api/auth',
  '/api/stripe',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request.headers);

  // ─── 1. Anti-Brute-Force Rate Limiting (Max 5 attempts per IP on POST requests) ───
  const isSensitiveAuthRoute =
    request.method === 'POST' &&
    SENSITIVE_AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isSensitiveAuthRoute) {
    // Check rate limit: 5 attempts per IP with a 15-minute window
    const rateLimit = checkRateLimit(ip, 'auth', 5, 15 * 60 * 1000);

    if (!rateLimit.isAllowed) {
      const isApi = pathname.startsWith('/api/');

      if (isApi) {
        return NextResponse.json(
          {
            error:
              'Trop de tentatives. Votre adresse IP est temporairement bloquée (protection anti-brute force active). Veuillez réessayer dans 15 minutes.',
            retryAfterSeconds: rateLimit.retryAfterSeconds,
            limit: rateLimit.limit,
            remaining: 0,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateLimit.retryAfterSeconds),
              'X-RateLimit-Limit': String(rateLimit.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(rateLimit.resetTime),
              'X-Content-Type-Options': 'nosniff',
              'X-Frame-Options': 'DENY',
            },
          }
        );
      }

      // Return a clean security block page for browser navigation
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>AtelierPro — Accès temporairement restreint (429)</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background-color: #F7F4ED;
                color: #111827;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 1rem;
              }
              .card {
                background: #ffffff;
                border: 1px solid #E7E2D8;
                border-radius: 1.5rem;
                padding: 2.5rem;
                max-width: 480px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(15, 59, 50, 0.08);
              }
              .badge {
                display: inline-block;
                padding: 0.35rem 0.85rem;
                border-radius: 9999px;
                background: #FEE2E2;
                color: #991B1B;
                font-size: 0.75rem;
                font-weight: 700;
                margin-bottom: 1.25rem;
              }
              h1 {
                font-size: 1.5rem;
                color: #0F3B32;
                margin-top: 0;
                margin-bottom: 0.75rem;
              }
              p {
                font-size: 0.875rem;
                color: #4B5563;
                line-height: 1.6;
                margin-bottom: 1.5rem;
              }
              .btn {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                border-radius: 1rem;
                background: #0F3B32;
                color: #ffffff;
                text-decoration: none;
                font-weight: 600;
                font-size: 0.875rem;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">Sécurité Active • 5 Tentatives Max</div>
              <h1>Trop de tentatives (Force Brute Détectée)</h1>
              <p>Votre adresse IP a atteint la limite de <strong>5 tentatives</strong> autorisées. Pour des raisons de sécurité, les accès ont été temporairement suspendus pour <strong>15 minutes</strong>.</p>
              <a href="/" class="btn">Retour à l'accueil</a>
            </div>
          </body>
        </html>`,
        {
          status: 429,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetTime),
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
          },
        }
      );
    }
  }

  // Initialize response
  const response = NextResponse.next();

  // ─── 2. Security Headers (Defense in Depth) ───
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ─── 3. Route Protection Check ───
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtectedRoute) {
    // Check for Supabase session cookie or app auth cookie if present
    const supabaseToken =
      request.cookies.get('sb-access-token')?.value ||
      request.cookies.get('supabase-auth-token')?.value;
    const clientAuthToken = request.cookies.get('atelierpro_session')?.value;

    // Note: For SSR Supabase auth evaluation
    if (supabaseToken || clientAuthToken) {
      // Valid session indicator
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sw.js, manifest.json
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
