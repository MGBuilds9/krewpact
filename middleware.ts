import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const isPublicRoute = createRouteMatcher([
  '/auth(.*)',
  '/api/webhooks(.*)',
  '/api/web/leads',
  '/api/cron(.*)',
]);

const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || 'mdmgroupinc.ca,mdmcontracting.ca').split(
  ',',
);

// Org slug regex: /org/{slug}/...
const ORG_PATH_RE = /^\/org\/([a-z0-9-]+)(\/|$)/;

// Paths that don't need org context (API routes handle their own, auth pages, etc.)
const SKIP_ORG_PATHS = ['/api/', '/auth', '/_next', '/favicon'];

// In-memory org cache (slug → { id, slug }). Cleared on cold start.
const orgCache = new Map<string, { id: string; slug: string; expiresAt: number }>();
const ORG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function resolveOrg(slug: string): Promise<{ id: string; slug: string } | null> {
  const cached = orgCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return { id: cached.id, slug: cached.slug };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (!data) return null;

  orgCache.set(slug, { id: data.id, slug: data.slug, expiresAt: Date.now() + ORG_CACHE_TTL });
  return { id: data.id, slug: data.slug };
}

export default clerkMiddleware(
  async (auth, req) => {
    const { userId, sessionClaims } = await auth();

    // Domain restriction
    if (userId && sessionClaims) {
      const email = (sessionClaims as Record<string, unknown>).email as string | undefined;
      if (email) {
        const domain = email.split('@')[1];
        if (ALLOWED_DOMAINS.length > 0 && !ALLOWED_DOMAINS.includes(domain)) {
          const url = new URL('/auth?error=domain_restricted', req.url);
          return Response.redirect(url);
        }
      }
    }

    if (!isPublicRoute(req)) {
      await auth.protect();
    }

    const { pathname } = req.nextUrl;

    // Skip org resolution for non-dashboard paths
    if (SKIP_ORG_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // Check if path already has org slug
    const orgMatch = pathname.match(ORG_PATH_RE);
    if (orgMatch) {
      const slug = orgMatch[1];
      const org = await resolveOrg(slug);

      if (!org) {
        // Invalid org slug — redirect to default
        const url = req.nextUrl.clone();
        url.pathname = pathname.replace(ORG_PATH_RE, '/org/default/');
        return NextResponse.redirect(url);
      }

      // Inject org context as request headers for downstream API routes and server components
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-krewpact-org-id', org.id);
      requestHeaders.set('x-krewpact-org-slug', org.slug);
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    // Authenticated user on a bare path (e.g., /dashboard, /crm/leads)
    // Redirect to org-scoped path
    if (userId) {
      const claims = sessionClaims as Record<string, unknown> | undefined;
      const orgId = claims?.krewpact_org_id as string | undefined;

      let orgSlug = 'default';

      if (orgId) {
        // Look up slug from org_id
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data } = await supabase
            .from('organizations')
            .select('slug')
            .eq('id', orgId)
            .single();
          if (data) orgSlug = data.slug;
        }
      }

      const url = req.nextUrl.clone();
      url.pathname = `/org/${orgSlug}${pathname}`;
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    authorizedParties: [
      'https://hub.mdmgroupinc.ca',
      'https://dashboard.mdmgroupinc.ca',
      'https://portal.mdmgroupinc.ca',
      'http://localhost:3000',
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
