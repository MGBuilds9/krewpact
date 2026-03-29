import { z } from 'zod';

import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Schema: Critical vars (required in production) vs optional (graceful degradation)
// ---------------------------------------------------------------------------

const envSchema = z
  .object({
    // ── Supabase (CRITICAL — app cannot function without these) ──
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    // Supavisor pooler URL (port 6543, transaction mode) — required for serverless
    SUPABASE_DB_URL: z.string().url().optional(),

    // ── Clerk (CRITICAL — auth fails without these) ──
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
    CLERK_SECRET_KEY: z.string().startsWith('sk_').optional(),
    CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),

    // ── ERPNext (optional — mock mode when missing) ──
    ERPNEXT_BASE_URL: z.string().url().optional(),
    ERPNEXT_API_KEY: z.string().min(1).optional(),
    ERPNEXT_API_SECRET: z.string().min(1).optional(),
    ERPNEXT_WEBHOOK_SECRET: z.string().min(1).optional(),
    ERPNEXT_COGS_ACCOUNT: z.string().min(1).optional(),
    ERPNEXT_STOCK_ACCOUNT: z.string().min(1).optional(),
    ERPNEXT_WAREHOUSE: z.string().min(1).optional(),

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

    // ── Enrichment API keys (optional — sources skip gracefully when missing) ──
    APOLLO_API_KEY: z.string().min(1).optional(),
    BRAVE_API_KEY: z.string().min(1).optional(),
    TAVILY_API_KEY: z.string().min(1).optional(),
    GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),

    // ── MERX (optional — bidding sync skipped when missing) ──
    MERX_API_URL: z.string().optional(),
    MERX_API_KEY: z.string().min(1).optional(),

    // ── Takeoff Engine (optional — mock mode when missing) ──
    TAKEOFF_ENGINE_URL: z.string().url().optional(),
    TAKEOFF_ENGINE_TOKEN: z.string().min(1).optional(),

    // ── Logging ──
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional().default('info'),

    // ── Proxy / Domain ──
    ALLOWED_DOMAINS: z.string().optional(),
    DEFAULT_ORG_SLUG: z.string().optional(),

    // ── App ──
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    EXPO_PUBLIC_API_BASE_URL: z.string().url().optional(),
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
    CRON_SECRET: z.string().min(1).optional(),
    // Fallback for CRON_SECRET — used for webhook signature verification
    WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),

    // ── Org defaults (optional — required for routes that need org scoping) ──
    DEFAULT_ORG_ID: z.string().uuid().optional(),

    // ── Company branding (optional — used in proposals and notifications) ──
    COMPANY_NAME: z.string().min(1).optional(),
    COMPANY_ADDRESS: z.string().min(1).optional(),
    COMPANY_PHONE: z.string().min(1).optional(),
    COMPANY_EMAIL: z.string().email().optional(),
    ALERT_EMAIL: z.string().email().optional(),
  })
  // Production-required: these are optional for local dev but MUST exist in production
  .superRefine((data, ctx) => {
    if (process.env.NODE_ENV !== 'production') return;

    if (!data.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_SERVICE_ROLE_KEY'],
        message:
          'Required in production — webhooks and admin operations will silently fail without it',
      });
    }
    if (!data.CLERK_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CLERK_SECRET_KEY'],
        message:
          'Required in production — server-side auth, webhook verification, and Graph OAuth will fail',
      });
    }
    if (!data.CRON_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CRON_SECRET'],
        message: 'Required in production — cron endpoints have no authentication without it',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Production warnings for optional but important vars
// ---------------------------------------------------------------------------

type EnvWarningCheck = {
  condition: (e: Record<string, string | undefined>) => boolean;
  message: string;
};

const ENV_WARNING_CHECKS: EnvWarningCheck[] = [
  {
    condition: (e) => !e.UPSTASH_REDIS_REST_URL || !e.UPSTASH_REDIS_REST_TOKEN,
    message: 'UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is DISABLED',
  },
  {
    condition: (e) =>
      !!e.QSTASH_TOKEN && (!e.QSTASH_CURRENT_SIGNING_KEY || !e.QSTASH_NEXT_SIGNING_KEY),
    message:
      'QSTASH signing keys not fully configured — background webhook verification will fail closed',
  },
  {
    condition: (e) => !e.CRON_SECRET && !e.WEBHOOK_SIGNING_SECRET,
    message: 'CRON_SECRET not set — cron endpoints have no auth',
  },
  {
    condition: (e) => !e.SENTRY_DSN && !e.NEXT_PUBLIC_SENTRY_DSN,
    message: 'SENTRY_DSN not set — error tracking is DISABLED',
  },
  {
    condition: (e) =>
      !!(e.SENTRY_DSN || e.NEXT_PUBLIC_SENTRY_DSN) && (!e.SENTRY_ORG || !e.SENTRY_PROJECT),
    message: 'SENTRY_ORG/SENTRY_PROJECT not set — source map uploads will be skipped',
  },
  {
    condition: (e) => !e.RESEND_API_KEY,
    message: 'RESEND_API_KEY not set — email sending will fail',
  },
  {
    condition: (e) => !e.EXPO_PUBLIC_API_BASE_URL || !e.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    message: 'Mobile public env vars not set — internal beta builds may boot with invalid config',
  },
  {
    condition: (e) => !e.APOLLO_API_KEY,
    message: 'APOLLO_API_KEY not set — Apollo enrichment source will be skipped',
  },
  {
    condition: (e) => !e.BRAVE_API_KEY,
    message: 'BRAVE_API_KEY not set — Brave web search enrichment will be skipped',
  },
  {
    condition: (e) => !e.TAVILY_API_KEY,
    message: 'TAVILY_API_KEY not set — Tavily AI search enrichment will be skipped',
  },
  {
    condition: (e) => !e.GOOGLE_MAPS_API_KEY,
    message: 'GOOGLE_MAPS_API_KEY not set — Google Maps enrichment will be skipped',
  },
  {
    condition: (e) => !e.DEFAULT_ORG_ID,
    message: 'DEFAULT_ORG_ID not set — org-scoped routes will use auth-derived org only',
  },
];

function warnMissingOptional(env: Record<string, string | undefined>): void {
  const warnings = ENV_WARNING_CHECKS.filter((check) => check.condition(env)).map(
    (check) => check.message,
  );

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
