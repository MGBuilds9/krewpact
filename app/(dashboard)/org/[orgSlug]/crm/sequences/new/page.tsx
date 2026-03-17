import type { Metadata } from 'next';

import NewPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Sequence',
  description: 'Create a new outreach automation sequence.',
};

export default function Page() {
  return <NewPageContent />;
}
