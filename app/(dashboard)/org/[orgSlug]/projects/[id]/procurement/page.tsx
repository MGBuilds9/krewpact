import type { Metadata } from 'next';

import ProcurementPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Procurement',
  description: 'Manage RFQs, bids, and procurement activities for this project.',
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProcurementPageContent params={params} />;
}
