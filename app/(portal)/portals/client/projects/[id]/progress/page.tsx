import type { Metadata } from 'next';

import { generateEntityMetadata } from '@/lib/metadata/generate-entity-metadata';

import ProgressPageContent from './_page-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return generateEntityMetadata('project', id, 'Progress');
}

export default function Page() {
  return <ProgressPageContent />;
}
