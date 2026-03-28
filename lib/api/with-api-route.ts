import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';

import { type Logger, logger as rootLogger } from '@/lib/logger';
import { generateRequestId, requestContext } from '@/lib/request-context';

import { verifyCronAuth } from './cron-auth';
import { ApiError, errorResponse, UNAUTHORIZED } from './errors';
import { rateLimit, rateLimitResponse } from './rate-limit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteConfig<TBody = unknown, TQuery = unknown> {
  /** Authentication mode. Default: 'required' */
  auth?: 'required' | 'public' | 'cron';

  /** Rate limiting. Default: 60 req/min for authenticated, 30 for public. false to disable. */
  rateLimit?: { limit: number; window: `${number} ${'s' | 'ms' | 'm' | 'h' | 'd'}` } | false;

  /** Zod schema for request body (POST/PUT/PATCH). Skipped for GET/DELETE. */
  bodySchema?: ZodSchema<TBody>;

  /** Zod schema for query/search params. */
  querySchema?: ZodSchema<TQuery>;

  /** Single permission check (e.g. 'users.manage'). User must have this permission. */
  permission?: string;

  /** Role-based access. User must have at least one of these roles. */
  roles?: string[];
}

interface RouteContext<TBody = unknown, TQuery = unknown> {
  req: NextRequest;
  params: Record<string, string>;
  userId: string;
  body: TBody;
  query: TQuery;
  logger: Logger;
  requestId: string;
}

type RouteHandler<TBody = unknown, TQuery = unknown> = (
  ctx: RouteContext<TBody, TQuery>,
) => Promise<NextResponse>;

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

async function resolveAuth(
  req: NextRequest,
  authMode: string,
): Promise<{ userId: string } | NextResponse> {
  if (authMode === 'required') {
    const session = await auth();
    if (!session.userId) return errorResponse(UNAUTHORIZED);
    return { userId: session.userId };
  }
  if (authMode === 'cron') {
    const result = await verifyCronAuth(req);
    if (!result.authorized) return errorResponse(UNAUTHORIZED);
    return { userId: 'cron' };
  }
  return { userId: 'anonymous' };
}

async function validateBody<TBody>(
  req: NextRequest,
  schema: ZodSchema<TBody> | undefined,
  method: string,
): Promise<{ body: TBody } | NextResponse> {
  let body = {} as TBody;
  if (!schema || !['POST', 'PUT', 'PATCH'].includes(method)) return { body };
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(rawBody);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: { issues: parsed.error.flatten() },
        },
      },
      { status: 400 },
    );
  body = parsed.data;
  return { body };
}

async function validateQuery<TQuery>(
  req: NextRequest,
  schema: ZodSchema<TQuery> | undefined,
): Promise<{ query: TQuery } | NextResponse> {
  let query = {} as TQuery;
  if (!schema) return { query };
  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: { issues: parsed.error.flatten() },
        },
      },
      { status: 400 },
    );
  query = parsed.data;
  return { query };
}

async function applyRateLimit(
  req: NextRequest,
  config: RouteConfig,
  userId: string,
  authMode: string,
): Promise<NextResponse | null> {
  if (config.rateLimit === false) return null;
  const defaults =
    authMode === 'public'
      ? { limit: 30, window: '1 m' as const }
      : { limit: 60, window: '1 m' as const };
  const rlConfig = config.rateLimit ?? defaults;
  const rl = await rateLimit(req, {
    ...rlConfig,
    identifier: userId !== 'anonymous' ? userId : null,
  });
  return rl.success ? null : rateLimitResponse(rl);
}

export function withApiRoute<TBody = unknown, TQuery = unknown>(
  config: RouteConfig<TBody, TQuery>,
  handler: RouteHandler<TBody, TQuery>,
) {
  return async (
    req: NextRequest,
    segmentCtx?: { params?: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const start = performance.now();
    const requestId = req.headers.get('x-request-id') || generateRequestId();
    const route = req.nextUrl.pathname;
    const method = req.method;

    return requestContext.run({ requestId, route, startTime: start }, async () => {
      try {
        const authMode = config.auth ?? 'required';
        const authResult = await resolveAuth(req, authMode);
        if (authResult instanceof NextResponse) return authResult;
        const { userId } = authResult;

        const rlResponse = await applyRateLimit(req, config as RouteConfig, userId, authMode);
        if (rlResponse) return rlResponse;

        if (config.permission || config.roles) {
          const { getKrewpactRoles } = await import('@/lib/api/org');
          const userRoles = await getKrewpactRoles();

          if (config.permission) {
            const { hasPermission: checkPerm, isInternalRole, isExternalRole } = await import(
              '@/lib/rbac/permissions.shared'
            );
            const typedRoles = userRoles.filter(
              (r): r is import('@/lib/rbac/permissions.shared').KrewpactRole =>
                isInternalRole(r) || isExternalRole(r),
            );
            if (
              !checkPerm(
                typedRoles,
                config.permission as import('@/lib/rbac/permissions.shared').Permission,
              )
            ) {
              throw new ApiError('FORBIDDEN', 'Insufficient permissions', 403);
            }
          }

          if (config.roles && !config.roles.some((r) => userRoles.includes(r))) {
            throw new ApiError('FORBIDDEN', 'Insufficient permissions', 403);
          }
        }

        const queryResult = await validateQuery(req, config.querySchema);
        if (queryResult instanceof NextResponse) return queryResult;

        const bodyResult = await validateBody(req, config.bodySchema, method);
        if (bodyResult instanceof NextResponse) return bodyResult;

        const params = segmentCtx?.params ? await segmentCtx.params : {};
        const reqLogger = rootLogger.child({ requestId, route, method, userId });
        const response = await handler({
          req,
          params,
          userId,
          body: bodyResult.body,
          query: queryResult.query,
          logger: reqLogger,
          requestId,
        });

        const durationMs = Math.round(performance.now() - start);
        reqLogger.info('Request completed', { status: response.status, durationMs });
        return response;
      } catch (err) {
        const durationMs = Math.round(performance.now() - start);
        const reqLogger = rootLogger.child({ requestId, route, method });
        if (err instanceof ApiError) {
          reqLogger.warn('Request failed', { code: err.code, status: err.status, durationMs });
          return errorResponse(err);
        }
        reqLogger.error('Unhandled error', {
          error: err instanceof Error ? err : undefined,
          errorMessage: err instanceof Error ? err.message : String(err),
          durationMs,
        });
        return NextResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
          { status: 500 },
        );
      }
    });
  };
}
