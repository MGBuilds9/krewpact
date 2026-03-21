import type { Metadata } from 'next';

import NewEstimatePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Estimate',
  description: 'Create a new project cost estimate.',
};

export default function Page() {
  return <NewEstimatePageContent />;
}
