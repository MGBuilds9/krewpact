import type { Metadata } from 'next';

import ItemDetailContent from './_page-content';

export const metadata: Metadata = {
  title: 'Item Details',
  description: 'View inventory item details, stock levels, and history.',
};

export default function Page() {
  return <ItemDetailContent />;
}
