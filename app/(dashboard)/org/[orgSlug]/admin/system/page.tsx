import type { Metadata } from 'next';

import SystemPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'System',
  description: 'System audit logs, webhook management, and platform diagnostics.',
};

export default function Page() {
  return <SystemPageContent />;
}
