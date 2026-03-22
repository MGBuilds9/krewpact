import { z } from 'zod';

import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Schema: Critical vars (required in production) vs optional (graceful degradation)
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // ── Supabase (CRITICAL — app cannot function without these) ──
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // ── Clerk (CRITICAL — auth fails without these) ──
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_').optional(),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),

  // ── ERPNext (optional — mock mode when missing) ──
  ERPNEXT_BASE_URL: z.string().url().optional(),
  ERPNEXT_API_KEY: z.string().min(1).optional(),
  ERPNEXT_API_SECRET: z.string().min(1).optional(),
  ERPNEXT_WEBHOOK_SECRET: z.string().min(1).optional(),

  // ── Upstash QStash (optional — in-memory queue when missing) ──
  QSTASH_TOKEN: z.string().min(1).optional(),
  QSTASH_URL: z.string().url().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),

  // ── Upstash Redis (optional — rate limiting bypassed when missing) ──
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ── Email (optional — sending fails gracefully) ──
  RESEND_API_KEY: z.string().min(1).optional(),

  // ── BoldSign (optional — mock mode when missing) ──
  BOLDSIGN_API_KEY: z.string().min(1).optional(),
  BOLDSIGN_WEBHOOK_SECRET: z.string().min(1).optional(),

  // ── Sentry (optional — error tracking disabled when missing) ──
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),

  // ── AI Providers (optional — features degrade gracefully) ──
  AI_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  // ── Takeoff Engine (optional — mock mode when missing) ──
  TAKEOFF_ENGINE_URL: z.string().url().optional(),
  TAKEOFF_ENGINE_TOKEN: z.string().min(1).optional(),

  // ── App ──
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  EXPO_PUBLIC_API_BASE_URL: z.string().url().optional(),
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  CRON_SECRET: z.string().min(1).optional(),
  WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Production warnings for optional but important vars
// ---------------------------------------------------------------------------

function warnMissingOptional(env: Record<string, string | undefined>): void {
  const warnings: string[] = [];

  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    warnings.push('UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is DISABLED');
  }
  if (env.QSTASH_TOKEN && (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY)) {
    warnings.push(
      'QSTASH signing keys not fully configured — background webhook verification will fail closed',
    );
  }
  if (!env.CRON_SECRET && !env.WEBHOOK_SIGNING_SECRET) {
    warnings.push('CRON_SECRET not set — cron endpoints have no auth');
  }
  if (!env.SENTRY_DSN && !env.NEXT_PUBLIC_SENTRY_DSN) {
    warnings.push('SENTRY_DSN not set — error tracking is DISABLED');
  }
  if ((env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN) && (!env.SENTRY_ORG || !env.SENTRY_PROJECT)) {
    warnings.push('SENTRY_ORG/SENTRY_PROJECT not set — source map uploads will be skipped');
  }
  if (!env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY not set — email sending will fail');
  }
  if (!env.EXPO_PUBLIC_API_BASE_URL || !env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    warnings.push(
      'Mobile public env vars not set — internal beta builds may boot with invalid config',
    );
  }

  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    logger.warn('[env] Production warnings', { warnings });
  }
}

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    logger.error('[env] Validation failed', { formatted });

    // Both dev and production throw on critical var failures.
    // The schema marks truly optional vars as .optional() so this only fires
    // when a required var (Supabase URL, Clerk key) is missing.
    throw new Error(`Missing or invalid environment variables:\n${formatted}`);
  }

  warnMissingOptional(process.env as Record<string, string | undefined>);

  return result.data;
}

export const env = validateEnv();
