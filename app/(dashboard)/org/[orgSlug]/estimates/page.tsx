import type { Metadata } from 'next';

import EstimatesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Estimates',
  description: 'Create and manage project cost estimates.',
};

export default function Page() {
  return <EstimatesPageContent />;
}
