import type { Metadata } from 'next';

import NewPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Bidding Opportunity',
  description: 'Create a new bidding opportunity record.',
};

export default function Page() {
  return <NewPageContent />;
}
