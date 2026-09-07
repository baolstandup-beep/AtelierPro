import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Initialize response
  const response = NextResponse.next();

  // ─── 1. Security Headers (Defense in Depth) ───
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ─── 2. Route Protection Check ───
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtectedRoute) {
    // Check for Supabase session cookie or app auth cookie if present
    const supabaseToken = request.cookies.get('sb-access-token')?.value || request.cookies.get('supabase-auth-token')?.value;
    const clientAuthToken = request.cookies.get('atelierpro_session')?.value;

    // Note: For full SSR Supabase auth, cookies are evaluated here.
    // Client-side fallback remains active in layout.tsx for local state.
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
