import type { Metadata } from 'next';

import SlaPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'SLA Configuration',
  description: 'Set service level agreement rules and response time thresholds.',
};

export default function Page() {
  return <SlaPageContent />;
}
