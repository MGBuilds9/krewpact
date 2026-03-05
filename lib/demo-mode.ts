/**
 * Demo mode configuration for KrewPact.
 * When NEXT_PUBLIC_DEMO_MODE=true, the app runs without Clerk auth
 * using a mock user context backed by the real Supabase database.
 */

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Runtime check: log Sentry error if demo mode is active in production
if (DEMO_MODE && typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.captureMessage('CRITICAL: Demo mode active in production — Clerk auth bypassed', {
      level: 'fatal',
    });
  });
}

export const DEMO_USER = {
  id: 'demo_clerk_user',
  firstName: 'Michael',
  lastName: 'Guirguis',
  fullName: 'Michael Guirguis',
  emailAddress: 'michael.guirguis@mdmgroupinc.ca',
  imageUrl: '',
  // Maps to the real Supabase user record
  supabaseUserId: 'd504ba2d-a6d8-464f-8219-7e61c5442316',
  clerkUserId: 'user_39BbzSttLdRRatl6gKatJJL6OAX',
} as const;
