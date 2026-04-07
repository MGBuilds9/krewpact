import type { Metadata } from 'next';

// This page immediately redirects to /dashboard, so the title is rarely
// rendered to the user — but if it is, the root layout's title template
// (`%s — ${siteName}`) would expand `'KrewPact'` to `'KrewPact — KrewPact'`
// (a doubled brand). Use a generic page name so the template can prepend
// the tenant brand cleanly. Same family as ISSUE-003.
export const metadata: Metadata = {
  title: 'Home',
  description: 'Construction operations platform',
};

import { redirect } from 'next/navigation';

export default async function OrgRootPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/org/${orgSlug}/dashboard`);
}
