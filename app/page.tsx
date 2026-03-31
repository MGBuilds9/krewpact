import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KrewPact',
  description: 'Construction operations platform',
};

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/auth');

  const meta = (sessionClaims as Record<string, unknown>)?.metadata as
    | Record<string, unknown>
    | undefined;
  const orgSlug = (meta?.krewpact_org_slug as string) || process.env.DEFAULT_ORG_SLUG || 'default';

  redirect(`/org/${orgSlug}/dashboard`);
}
