import type { Metadata } from 'next';

import RolesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Roles & Permissions',
  description: 'Manage user roles and permission overrides.',
};

export default function Page() {
  return <RolesPageContent />;
}
