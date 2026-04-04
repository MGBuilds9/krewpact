import type { Metadata } from 'next';

import { generateEntityMetadata } from '@/lib/metadata/generate-entity-metadata';

import SubmittalsPageContent from './_page-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; orgSlug: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return generateEntityMetadata('project', id, 'Submittals');
}

export default function Page() {
  return <SubmittalsPageContent />;
}
