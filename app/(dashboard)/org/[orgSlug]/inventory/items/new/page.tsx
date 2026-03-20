import type { Metadata } from 'next';

import NewItemContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Inventory Item',
  description: 'Add a new item to inventory.',
};

export default function Page() {
  return <NewItemContent />;
}
