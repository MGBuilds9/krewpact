import type { Metadata } from 'next';

import NewPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Contact',
  description: 'Create a new contact record.',
};

export default function Page() {
  return <NewPageContent />;
}
