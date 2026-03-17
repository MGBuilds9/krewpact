import type { Metadata } from 'next';

import CatalogPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Cost Catalog',
  description: 'Browse and manage the cost catalog for materials, labour, and equipment.',
};

export default function Page() {
  return <CatalogPageContent />;
}
