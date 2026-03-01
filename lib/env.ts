import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_').optional(),

  // ERPNext
  ERPNEXT_BASE_URL: z.string().url().optional(),
  ERPNEXT_API_KEY: z.string().min(1).optional(),
  ERPNEXT_API_SECRET: z.string().min(1).optional(),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error(`Environment validation failed:\n${formatted}`);

    // In development, throw to fail fast. In production, log and continue
    // (Vercel sets env vars at deploy time — missing vars indicate misconfiguration).
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`Missing or invalid environment variables:\n${formatted}`);
    }
  }

  return result.data ?? (process.env as unknown as Env);
}

export const env = validateEnv();
