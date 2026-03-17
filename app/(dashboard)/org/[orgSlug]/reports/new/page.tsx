import type { Metadata } from 'next';

import NewPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Report',
  description: 'Create a custom report for your organization.',
};

export default function Page() {
  return <NewPageContent />;
}
