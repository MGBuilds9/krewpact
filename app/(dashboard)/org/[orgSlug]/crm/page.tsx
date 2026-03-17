import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CRM',
  description: 'Customer relationship management for MDM Group.',
};

import { redirect } from 'next/navigation';

export default async function CRMPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/org/${orgSlug}/crm/dashboard`);
}
