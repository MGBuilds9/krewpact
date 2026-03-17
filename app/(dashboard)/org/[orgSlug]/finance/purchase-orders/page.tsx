import type { Metadata } from 'next';

import PurchaseOrdersPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Purchase Orders',
  description: 'View and manage purchase orders synced from ERPNext.',
};

export default function Page() {
  return <PurchaseOrdersPageContent />;
}
