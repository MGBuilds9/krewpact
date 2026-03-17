import type { Metadata } from 'next';

import SafetyPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Safety',
  description: 'Safety inspections, incidents, forms, and toolbox talks.',
};

export default function Page() {
  return <SafetyPageContent />;
}
