import type { Metadata } from 'next';

import MigrationPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Data Migration',
  description: 'Manage data migration batches and resolve import conflicts.',
};

export default function Page() {
  return <MigrationPageContent />;
}
