import type { Metadata } from 'next';

import AccountsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Account Details',
  description: 'View account details, contacts, revenue history, and project links.',
};

export default function Page() {
  return <AccountsPageContent />;
}
