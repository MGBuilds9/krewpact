import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KrewPact',
  description: 'Construction operations platform for MDM Group Inc.',
};

import { redirect } from 'next/navigation';

export default async function OrgRootPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/org/${orgSlug}/dashboard`);
}
