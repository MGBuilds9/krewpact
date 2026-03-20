import type { Metadata } from 'next';

import NewPoPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Purchase Order',
  description: 'Create a new purchase order for inventory procurement.',
};

export default function Page() {
  return <NewPoPageContent />;
}
