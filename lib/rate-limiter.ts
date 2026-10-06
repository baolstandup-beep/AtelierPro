// AtelierPro Rate Limiter — Anti-Brute Force Protection
// Limits sensitive endpoints to a maximum of 5 attempts per IP address.
//
// Sur Vercel chaque instance serverless a sa propre mémoire : utilisez
// checkRateLimitShared / resetRateLimitShared, qui s'appuient sur la RPC
// Supabase `check_rate_limit` (migration 20261006_shared_rate_limits.sql)
// et retombent sur le compteur en mémoire si elle est indisponible.

interface RateLimitRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

// In-memory store for IP request tracking
const ipStore = new Map<string, RateLimitRecord>();

// Default configuration: Max 5 attempts per IP within a 15-minute window
export const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  BLOCK_DURATION_MS: 15 * 60 * 1000, // 15 minutes block when threshold is breached
};

/**
 * Extract real client IP address from Next.js request headers
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return '127.0.0.1';
}

/**
 * Check and increment rate limit for a specific IP or identifier.
 * Blocks brute-force attacks after 5 attempts.
 */
export function checkRateLimit(
  ip: string,
  prefix = 'auth',
  maxAttempts = RATE_LIMIT_CONFIG.MAX_ATTEMPTS,
  windowMs = RATE_LIMIT_CONFIG.WINDOW_MS
): {
  isAllowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
  totalAttempts: number;
} {
  // Always allow local loopback in development to prevent lockouts during local testing
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return {
      isAllowed: true,
      limit: maxAttempts,
      remaining: maxAttempts,
      resetTime: Date.now() + windowMs,
      retryAfterSeconds: 0,
      totalAttempts: 0,
    };
  }

  const now = Date.now();
  const key = `${prefix}:${ip}`;
  const record = ipStore.get(key);

  // 1. If currently blocked
  if (record && record.blockedUntil && now < record.blockedUntil) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      isAllowed: false,
      limit: maxAttempts,
      remaining: 0,
      resetTime: record.blockedUntil,
      retryAfterSeconds,
      totalAttempts: record.count,
    };
  }

  // 2. If no record or expired window, initialize fresh record
  if (!record || now - record.firstAttemptAt > windowMs) {
    ipStore.set(key, {
      count: 1,
      firstAttemptAt: now,
      blockedUntil: null,
    });

    return {
      isAllowed: true,
      limit: maxAttempts,
      remaining: maxAttempts - 1,
      resetTime: now + windowMs,
      retryAfterSeconds: 0,
      totalAttempts: 1,
    };
  }

  // 3. Increment attempt count
  record.count += 1;

  // 4. Check if threshold is breached (> 5 attempts)
  if (record.count > maxAttempts) {
    record.blockedUntil = now + RATE_LIMIT_CONFIG.BLOCK_DURATION_MS;
    const retryAfterSeconds = Math.ceil(RATE_LIMIT_CONFIG.BLOCK_DURATION_MS / 1000);

    return {
      isAllowed: false,
      limit: maxAttempts,
      remaining: 0,
      resetTime: record.blockedUntil,
      retryAfterSeconds,
      totalAttempts: record.count,
    };
  }

  // 5. Still within allowed limit
  const remaining = Math.max(0, maxAttempts - record.count);
  const resetTime = record.firstAttemptAt + windowMs;

  return {
    isAllowed: true,
    limit: maxAttempts,
    remaining,
    resetTime,
    retryAfterSeconds: 0,
    totalAttempts: record.count,
  };
}

export type RateLimitResult = ReturnType<typeof checkRateLimit>;

function getSharedStoreConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Rate limit partagé entre toutes les instances (Supabase), avec repli
 * sur le compteur en mémoire si la RPC n'est pas disponible.
 */
export async function checkRateLimitShared(
  ip: string,
  prefix = 'auth',
  maxAttempts = RATE_LIMIT_CONFIG.MAX_ATTEMPTS,
  windowMs = RATE_LIMIT_CONFIG.WINDOW_MS
): Promise<RateLimitResult> {
  const config = getSharedStoreConfig();
  if (!config || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return checkRateLimit(ip, prefix, maxAttempts, windowMs);
  }

  try {
    const res = await fetch(`${config.url}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_key: `${prefix}:${ip}`,
        p_max: maxAttempts,
        p_window_seconds: Math.ceil(windowMs / 1000),
        p_block_seconds: Math.ceil(RATE_LIMIT_CONFIG.BLOCK_DURATION_MS / 1000),
      }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`RPC check_rate_limit: HTTP ${res.status}`);

    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error('RPC check_rate_limit: réponse vide');

    return {
      isAllowed: Boolean(row.allowed),
      limit: maxAttempts,
      remaining: row.allowed ? Math.max(0, maxAttempts - row.attempts) : 0,
      resetTime: new Date(row.reset_at).getTime(),
      retryAfterSeconds: row.retry_after_seconds,
      totalAttempts: row.attempts,
    };
  } catch (err) {
    console.warn('[RateLimit] Store partagé indisponible, repli en mémoire :', err);
    return checkRateLimit(ip, prefix, maxAttempts, windowMs);
  }
}

/**
 * Réinitialise le compteur partagé (et le compteur en mémoire).
 */
export async function resetRateLimitShared(ip: string, prefix = 'auth'): Promise<void> {
  resetRateLimit(ip, prefix);
  const config = getSharedStoreConfig();
  if (!config) return;

  try {
    await fetch(
      `${config.url}/rest/v1/rate_limits?key=eq.${encodeURIComponent(`${prefix}:${ip}`)}`,
      {
        method: 'DELETE',
        headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
        cache: 'no-store',
      }
    );
  } catch (err) {
    console.warn('[RateLimit] Réinitialisation partagée impossible :', err);
  }
}

/**
 * Reset rate limit for a given IP (e.g. after successful authentication)
 */
export function resetRateLimit(ip: string, prefix = 'auth'): void {
  const key = `${prefix}:${ip}`;
  ipStore.delete(key);
}

// Automatic cleanup every 10 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipStore.entries()) {
      const isExpired =
        now - record.firstAttemptAt > RATE_LIMIT_CONFIG.WINDOW_MS &&
        (!record.blockedUntil || now > record.blockedUntil);
      if (isExpired) {
        ipStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}
