import type { Metadata } from 'next';

import { generateEntityMetadata } from '@/lib/metadata/generate-entity-metadata';

import WarrantyPage from './_page-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; orgSlug: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return generateEntityMetadata('project', id, 'Warranty');
}

export default function Page({ params }: { params: Promise<{ id: string; orgSlug: string }> }) {
  return <WarrantyPage params={params} />;
}
