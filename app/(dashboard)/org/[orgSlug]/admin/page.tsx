import type { Metadata } from 'next';

import AdminPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Organization administration overview, users, and settings.',
};

export default function Page() {
  return <AdminPageContent />;
}
