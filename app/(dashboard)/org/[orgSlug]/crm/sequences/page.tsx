import type { Metadata } from 'next';

import SequencesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Sequences',
  description: 'Manage automated outreach sequences and enrollment workflows.',
};

export default function Page() {
  return <SequencesPageContent />;
}
