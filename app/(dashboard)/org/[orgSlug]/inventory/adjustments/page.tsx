import type { Metadata } from 'next';

import AdjustmentsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Stock Adjustments',
  description: 'Record inventory gains and losses.',
};

export default function Page() {
  return <AdjustmentsPageContent />;
}
