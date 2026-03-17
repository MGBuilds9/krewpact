import type { Metadata } from 'next';

import LeadGenPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Lead Generation',
  description: 'Configure and monitor automated lead generation pipelines.',
};

export default function Page() {
  return <LeadGenPageContent />;
}
