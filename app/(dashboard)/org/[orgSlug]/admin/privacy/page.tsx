import type { Metadata } from 'next';

import PrivacyPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Privacy Requests',
  description: 'Manage PIPEDA privacy requests and data subject access requests.',
};

export default function Page() {
  return <PrivacyPageContent />;
}
