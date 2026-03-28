import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { generateRequestId } from '@/lib/request-context';

const isPublicRoute = createRouteMatcher([
  '/auth(.*)',
  '/api/webhooks(.*)',
  '/api/web/leads',
  '/api/cron(.*)',
  '/api/health',
  '/api/email/track(.*)',
]);

const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || '').split(',');

// Org slug regex: /org/{slug}/...
const ORG_PATH_RE = /^\/org\/([a-z0-9-]+)(\/|$)/;

// Paths that don't need org context (API routes handle their own, auth pages, etc.)
const SKIP_ORG_PATHS = ['/api/', '/auth', '/_next', '/favicon'];

const DEFAULT_ORG_SLUG = process.env.DEFAULT_ORG_SLUG || 'mdm-group';

export const proxy = clerkMiddleware(
  async (auth, req) => {
    const requestId = generateRequestId();
    const { userId, sessionClaims } = await auth();

    // Domain restriction
    if (userId && sessionClaims) {
      const email = (sessionClaims as Record<string, unknown>).email as string | undefined;
      if (email) {
        const domain = email.split('@')[1];
        if (ALLOWED_DOMAINS.length > 0 && !ALLOWED_DOMAINS.includes(domain)) {
          console.warn(
            JSON.stringify({
              level: 'warn',
              message: 'Domain restricted',
              requestId,
              email: email.split('@')[0] + '@***',
              domain,
              path: req.nextUrl.pathname,
            }),
          );
          const url = new URL('/auth?error=domain_restricted', req.url);
          return Response.redirect(url);
        }
      }
    }

    if (!isPublicRoute(req)) {
      await auth.protect();
    }

    const { pathname } = req.nextUrl;
    const headers = new Headers(req.headers);
    headers.set('x-request-id', requestId);

    // Skip org resolution for non-dashboard paths
    if (SKIP_ORG_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next({ request: { headers } });
    }

    // Org-scoped path — pass through (no DB validation needed, single-org app)
    if (ORG_PATH_RE.test(pathname)) {
      return NextResponse.next({ request: { headers } });
    }

    // Authenticated user on a bare path (e.g., /dashboard, /crm/leads)
    // Redirect to org-scoped path
    if (userId) {
      const url = req.nextUrl.clone();
      url.pathname = `/org/${DEFAULT_ORG_SLUG}${pathname}`;
      const response = NextResponse.redirect(url);
      response.headers.set('x-request-id', requestId);
      return response;
    }

    return NextResponse.next({ request: { headers } });
  },
  {
    authorizedParties: [
      'https://krewpact.ca',
      'https://hub.krewpact.ca',
      'https://app.krewpact.ca',
      'https://portal.krewpact.ca',
      ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL.trim()] : []),
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL.trim()}`] : []),
      ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
    ],
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
