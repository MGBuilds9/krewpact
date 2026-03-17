import type { Metadata } from 'next';

import TemplatesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Estimate Templates',
  description: 'Manage estimate templates to speed up common project types.',
};

export default function Page() {
  return <TemplatesPageContent />;
}
