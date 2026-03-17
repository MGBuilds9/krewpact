import type { Metadata } from 'next';

import SelectionsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Selections',
  description: 'Manage client finish selections and choices.',
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SelectionsPageContent params={params} />;
}
