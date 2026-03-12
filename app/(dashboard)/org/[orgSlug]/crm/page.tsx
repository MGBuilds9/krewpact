import { redirect } from 'next/navigation';

export default async function CRMPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/org/${orgSlug}/crm/dashboard`);
}
