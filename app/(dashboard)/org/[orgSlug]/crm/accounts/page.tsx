import type { Metadata } from 'next';

import AccountsView from './AccountsView';

export const metadata: Metadata = {
  title: 'Accounts',
  description: 'Manage client accounts, prospects, and partner organizations.',
};

export default function AccountsPage() {
  return <AccountsView />;
}
