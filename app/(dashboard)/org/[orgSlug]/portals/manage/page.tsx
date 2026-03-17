import type { Metadata } from 'next';

import ManagePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Manage Portals',
  description: 'Configure portal accounts, announcements, and visibility settings.',
};

export default function Page() {
  return <ManagePageContent />;
}
