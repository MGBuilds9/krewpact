import type { Metadata } from 'next';

import { generateEntityMetadata } from '@/lib/metadata/generate-entity-metadata';

import ChangeOrdersPageContent from './_page-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; orgSlug: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return generateEntityMetadata('project', id, 'Change Orders');
}

export default function Page() {
  return <ChangeOrdersPageContent />;
}
