import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

interface RateLimitConfig {
  limit?: number;
  window?: `${number} ${'s' | 'ms' | 'm' | 'h' | 'd'}`;
  identifier?: string | null;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  req: Request,
  config: RateLimitConfig = {},
): Promise<RateLimitResult> {
  const { limit = 60, window = '1 m', identifier } = config;
  const r = getRedis();
  if (!r) return { success: true, remaining: limit, reset: 0 };

  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
  });

  const id =
    identifier ||
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'anonymous';

  try {
    const result = await limiter.limit(id);
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  } catch {
    return { success: true, remaining: limit, reset: 0 };
  }
}

export function rateLimitResponse(result: RateLimitResult) {
  const { NextResponse } = require('next/server') as typeof import('next/server');
  return NextResponse.json(
    { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
        'Retry-After': String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
      },
    },
  );
}
