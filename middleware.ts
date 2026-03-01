import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/auth(.*)',
  '/api/webhooks(.*)',
  '/api/web/leads',
  '/api/cron(.*)',
]);

const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || 'mdmgroupinc.ca,mdmcontracting.ca').split(',');

export default clerkMiddleware(async (auth, req) => {
  // Domain restriction — only allow @mdmconstruction.com users
  const { userId, sessionClaims } = await auth();

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
}, { authorizedParties: ['https://hub.mdmgroupinc.ca', 'https://dashboard.mdmgroupinc.ca', 'https://portal.mdmgroupinc.ca', 'http://localhost:3000'] });

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
