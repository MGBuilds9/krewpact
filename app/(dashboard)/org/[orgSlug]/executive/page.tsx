import type { Metadata } from 'next';

import ExecutivePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Executive Intelligence',
  description: 'AI-powered executive insights, alerts, and performance forecasts.',
};

export default function Page() {
  return <ExecutivePageContent />;
}
