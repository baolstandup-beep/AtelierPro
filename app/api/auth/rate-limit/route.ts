import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rate-limiter';

/**
 * POST /api/auth/rate-limit
 * Verifies or increments login attempt for the client IP.
 * Enforces max 5 attempts per IP to prevent brute-force attacks.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'attempt'; // 'attempt' | 'success'

    // If client succeeded login, reset rate limiter for this IP
    if (action === 'success') {
      resetRateLimit(ip, 'auth');
      return NextResponse.json({
        success: true,
        message: 'Rate limit réinitialisé avec succès.',
      });
    }

    // Check rate limit (max 5 attempts per IP)
    const result = checkRateLimit(ip, 'auth', 5, 15 * 60 * 1000);

    if (!result.isAllowed) {
      return NextResponse.json(
        {
          error: 'Trop de tentatives. Votre adresse IP a été temporairement bloquée pour protéger votre atelier contre les attaques par force brute.',
          retryAfterSeconds: result.retryAfterSeconds,
          limit: result.limit,
          remaining: 0,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfterSeconds),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.resetTime),
          },
        }
      );
    }

    return NextResponse.json(
      {
        allowed: true,
        remainingAttempts: result.remaining,
        totalAttempts: result.totalAttempts,
        maxAttempts: result.limit,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    );
  } catch (err) {
    console.error('[RateLimit API Error]', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
