import type { Metadata } from 'next';

import AuditLogPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Audit Log',
  description: 'Track all user actions and system events for compliance and security.',
};

export default function Page() {
  return <AuditLogPageContent />;
}
