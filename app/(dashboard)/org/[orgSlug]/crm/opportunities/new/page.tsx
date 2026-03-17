import type { Metadata } from 'next';

import NewPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Opportunity',
  description: 'Create a new sales opportunity.',
};

export default function Page() {
  return <NewPageContent />;
}
