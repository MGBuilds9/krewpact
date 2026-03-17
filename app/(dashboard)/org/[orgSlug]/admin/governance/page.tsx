import type { Metadata } from 'next';

import GovernancePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Governance',
  description: 'Manage reference data sets and organizational governance rules.',
};

export default function Page() {
  return <GovernancePageContent />;
}
