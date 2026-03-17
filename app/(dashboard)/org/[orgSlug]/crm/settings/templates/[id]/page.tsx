import type { Metadata } from 'next';

import TemplatesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Edit Email Template',
  description: 'Edit email template content, merge fields, and settings.',
};

export default function Page() {
  return <TemplatesPageContent />;
}
