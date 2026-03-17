import type { Metadata } from 'next';

import SubmittalsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Submittals',
  description: 'Track and review project submittals and approvals.',
};

export default function Page() {
  return <SubmittalsPageContent />;
}
