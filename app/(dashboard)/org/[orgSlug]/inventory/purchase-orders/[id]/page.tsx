import type { Metadata } from 'next';

import PoDetailPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Purchase Order Detail',
  description: 'View and manage a purchase order.',
};

export default function Page() {
  return <PoDetailPageContent />;
}
