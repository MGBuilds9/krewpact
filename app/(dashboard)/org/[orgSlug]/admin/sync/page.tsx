import type { Metadata } from 'next';

import SyncPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'ERP Sync Status',
  description: 'Monitor ERPNext synchronization status and entity sync health.',
};

export default function Page() {
  return <SyncPageContent />;
}
