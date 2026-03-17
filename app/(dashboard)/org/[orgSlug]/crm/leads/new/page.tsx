import type { Metadata } from 'next';

import NewPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Lead',
  description: 'Create a new lead record.',
};

export default function Page() {
  return <NewPageContent />;
}
