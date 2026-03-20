import type { Metadata } from 'next';

import ItemsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Inventory Items',
  description: 'Manage inventory items and stock levels.',
};

export default function Page() {
  return <ItemsPageContent />;
}
