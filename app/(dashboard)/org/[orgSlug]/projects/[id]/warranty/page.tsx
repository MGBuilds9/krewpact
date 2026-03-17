import type { Metadata } from 'next';

import WarrantyPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Warranty',
  description: 'Manage warranty items and post-construction obligations.',
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <WarrantyPageContent params={params} />;
}
