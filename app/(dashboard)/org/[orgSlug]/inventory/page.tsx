import type { Metadata } from 'next';

import OverviewPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Inventory Overview',
  description: 'Stock levels, low stock alerts, and recent transactions.',
};

export default function Page() {
  return <OverviewPageContent />;
}
