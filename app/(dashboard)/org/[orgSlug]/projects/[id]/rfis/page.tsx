import type { Metadata } from 'next';

import RfisPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'RFIs',
  description: 'Submit and track requests for information on this project.',
};

export default function Page() {
  return <RfisPageContent />;
}
