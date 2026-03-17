import type { Metadata } from 'next';

import UsersPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Users',
  description: 'Manage users, divisions, and access levels.',
};

export default function Page() {
  return <UsersPageContent />;
}
