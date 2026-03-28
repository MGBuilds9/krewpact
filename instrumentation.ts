import * as Sentry from '@sentry/nextjs';

export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.warn('[sentry] No SENTRY_DSN configured — error tracking is disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

export function onRequestError(
  err: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: { routerKind: string; routePath: string; routeType: string; renderSource: string },
) {
  Sentry.captureException(err, {
    extra: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
    },
  });
}
