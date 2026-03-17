import type { Metadata } from 'next';

import ReportsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Generate and view operational and CRM reports.',
};

export default function Page() {
  return <ReportsPageContent />;
}
