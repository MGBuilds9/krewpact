import type { Metadata } from 'next';

import EstimatesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Estimate Builder',
  description: 'Build and edit detailed project cost estimates with line items.',
};

export default function Page() {
  return <EstimatesPageContent />;
}
