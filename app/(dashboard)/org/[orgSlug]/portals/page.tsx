import type { Metadata } from 'next';

import PortalsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Portals',
  description: 'Manage client and trade partner portal access and permissions.',
};

export default function Page() {
  return <PortalsPageContent />;
}
