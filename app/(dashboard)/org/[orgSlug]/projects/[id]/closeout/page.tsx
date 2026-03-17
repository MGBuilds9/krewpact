import type { Metadata } from 'next';

import CloseoutPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Project Closeout',
  description: 'Manage closeout packages, deficiencies, service calls, and warranties.',
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <CloseoutPageContent params={params} />;
}
