import type { Metadata } from 'next';

import BcpPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Business Continuity',
  description: 'Manage business continuity incidents and recovery events.',
};

export default function Page() {
  return <BcpPageContent />;
}
