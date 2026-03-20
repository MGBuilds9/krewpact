import type { Metadata } from 'next';

import SuppressionLogPage from './_page-content';

export const metadata: Metadata = {
  title: 'Suppression Log',
  description: 'View leads suppressed from outreach due to existing customer matches.',
};

export default function Page() {
  return <SuppressionLogPage />;
}
