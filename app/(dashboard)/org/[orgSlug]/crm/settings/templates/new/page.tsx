import type { Metadata } from 'next';

import NewPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Email Template',
  description: 'Create a new reusable email template.',
};

export default function Page() {
  return <NewPageContent />;
}
