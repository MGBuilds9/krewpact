import type { Metadata } from 'next';

import PurchaseOrdersPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Purchase Orders',
  description: 'Manage purchase orders and procurement for inventory.',
};

export default function Page() {
  return <PurchaseOrdersPageContent />;
}
