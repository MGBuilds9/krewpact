import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Only allow alphanumeric, hyphens, underscores, dots, and forward slashes.
// Explicitly rejects: path traversal (..), double slashes, query strings, protocols.
const SAFE_SLUG_RE = /^[a-zA-Z0-9_\-.]+(\/[a-zA-Z0-9_\-.]+)*$/;

function validateSlug(slug: string[]): { valid: true; path: string } | { valid: false } {
  // Reject empty slugs
  if (slug.length === 0) return { valid: false };

  const joined = slug.join('/');

  // Reject path traversal
  if (joined.includes('..')) return { valid: false };

  // Reject double slashes (can't happen from slug array but guard anyway)
  if (joined.includes('//')) return { valid: false };

  // Reject protocol schemes (e.g. http://, javascript:)
  if (/[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(joined)) return { valid: false };

  // Reject query strings
  if (joined.includes('?') || joined.includes('#') || joined.includes('&')) return { valid: false };

  // Allowlist check
  if (!SAFE_SLUG_RE.test(joined)) return { valid: false };

  return { valid: true, path: joined };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { userId } = await auth();

  if (!userId) {
    logger.warn('[go/erpnext] Unauthenticated redirect attempt', {
      url: req.url,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  const validation = validateSlug(slug);

  if (!validation.valid) {
    logger.warn('[go/erpnext] Invalid slug rejected', { slug, userId });
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const erpNextBaseUrl = process.env.ERPNEXT_BASE_URL;

  if (!erpNextBaseUrl) {
    logger.error('[go/erpnext] ERPNEXT_BASE_URL not configured');
    return NextResponse.json({ error: 'ERPNext not configured' }, { status: 503 });
  }

  const targetUrl = `${erpNextBaseUrl}/app/${validation.path}`;
  const rawReturn = req.headers.get('referer') ?? '/';
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const returnUrl = rawReturn.startsWith(appOrigin) || rawReturn.startsWith('/') ? rawReturn : '/';

  logger.info('[go/erpnext] Redirecting to ERPNext', {
    userId,
    targetUrl,
    returnUrl,
  });

  const response = NextResponse.redirect(targetUrl, { status: 302 });

  // Set return cookie so ERPNext's back bar knows where to navigate back to.
  // HttpOnly=false intentionally — ERPNext JS reads this cookie client-side.
  response.cookies.set('kp_return_url', returnUrl, {
    sameSite: 'lax',
    secure: true,
    httpOnly: false,
    maxAge: 3600,
    path: '/',
  });

  return response;
}
