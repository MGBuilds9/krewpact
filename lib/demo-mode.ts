/**
 * Demo mode configuration for KrewPact.
 * When NEXT_PUBLIC_DEMO_MODE=true, the app runs without Clerk auth
 * using a mock user context backed by the real Supabase database.
 */

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

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
