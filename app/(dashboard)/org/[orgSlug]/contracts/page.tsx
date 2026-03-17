import type { Metadata } from 'next';

import ContractsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Contracts',
  description: 'Manage contracts, agreements, and e-sign envelopes.',
};

export default function Page() {
  return <ContractsPageContent />;
}
