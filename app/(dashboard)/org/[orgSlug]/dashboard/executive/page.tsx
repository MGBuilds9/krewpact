import type { Metadata } from 'next';

import ExecutivePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Executive Dashboard',
  description: 'Executive KPIs, pipeline overview, and division performance metrics.',
};

export default function Page() {
  return <ExecutivePageContent />;
}
