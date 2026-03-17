import type { Metadata } from 'next';

import TemplatesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Email Templates',
  description: 'Manage reusable email templates for outreach and follow-up campaigns.',
};

export default function Page() {
  return <TemplatesPageContent />;
}
