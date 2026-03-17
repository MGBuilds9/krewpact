import type { Metadata } from 'next';

import NewPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'New Account',
  description: 'Create a new client account record.',
};

export default function Page() {
  return <NewPageContent />;
}
