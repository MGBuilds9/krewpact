import type { Metadata } from 'next';

import InvoicesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Invoices',
  description: 'View and manage sales and purchase invoices synced from ERPNext.',
};

export default function Page() {
  return <InvoicesPageContent />;
}
