import type { Metadata } from 'next';

import CrmOverviewPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'CRM Overview Report',
  description: 'Comprehensive CRM performance metrics and pipeline analysis.',
};

export default function Page() {
  return <CrmOverviewPageContent />;
}
