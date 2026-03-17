import type { Metadata } from 'next';

import JobCostsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Job Costs',
  description: 'Track project job costs and budget variances.',
};

export default function Page() {
  return <JobCostsPageContent />;
}
