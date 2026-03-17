import type { Metadata } from 'next';

import SequencesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Sequence Defaults',
  description: 'Configure default settings and throttling for outreach sequences.',
};

export default function Page() {
  return <SequencesPageContent />;
}
