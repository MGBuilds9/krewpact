import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    tracePropagationTargets: [
      /^https:\/\/.*\.krewpact\.ca/,
      /^https:\/\/.*\.supabase\.co/,
      // ERPNext base URL injected at runtime via env var
      ...(process.env.ERPNEXT_BASE_URL ? [process.env.ERPNEXT_BASE_URL] : []),
    ],

    // Errors that are almost always transient network noise.
    // NOTE: dropping ECONNRESET/ETIMEDOUT here could mask a sustained outage;
    // rely on BetterStack uptime monitors as the safety net for that case.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Failed to fetch',
    ],

    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value ?? '';
      if (/ECONNRESET|ETIMEDOUT/.test(message)) {
        return null;
      }
      return event;
    },
  });
}
