import type { Metadata } from 'next';

import { generateEntityMetadata } from '@/lib/metadata/generate-entity-metadata';

import ContactDetailPage from './_page-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; orgSlug: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return generateEntityMetadata('contact', id);
}

export default function Page() {
  return <ContactDetailPage />;
}
