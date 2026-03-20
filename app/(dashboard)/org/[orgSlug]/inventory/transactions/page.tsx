import type { Metadata } from 'next';

import TransactionsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Inventory Transactions',
  description: 'View the inventory transaction ledger and audit trail.',
};

export default function Page() {
  return <TransactionsPageContent />;
}
