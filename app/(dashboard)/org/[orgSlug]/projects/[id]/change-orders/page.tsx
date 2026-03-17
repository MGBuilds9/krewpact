import type { Metadata } from 'next';

import ChangeOrdersPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Change Orders',
  description: 'Manage project change orders and change requests.',
};

export default function Page() {
  return <ChangeOrdersPageContent />;
}
