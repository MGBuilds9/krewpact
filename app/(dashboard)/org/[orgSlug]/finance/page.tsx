import type { Metadata } from 'next';

import FinancePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Finance',
  description: 'Financial overview, invoices, job costs, and purchase orders.',
};

export default function Page() {
  return <FinancePageContent />;
}
