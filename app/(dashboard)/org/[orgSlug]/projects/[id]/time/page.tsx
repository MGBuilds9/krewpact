import type { Metadata } from 'next';

import TimePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Time Entries',
  description: 'Log and review project time entries.',
};

export default function Page() {
  return <TimePageContent />;
}
