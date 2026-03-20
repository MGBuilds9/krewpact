import type { Metadata } from 'next';

import ReceivePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Receive Materials',
  description: 'Receive materials against a purchase order.',
};

export default function Page() {
  return <ReceivePageContent />;
}
