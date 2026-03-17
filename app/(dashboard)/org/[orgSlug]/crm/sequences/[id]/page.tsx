import type { Metadata } from 'next';

import SequencesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Sequence Details',
  description: 'Configure sequence steps, enrollment rules, and performance analytics.',
};

export default function Page() {
  return <SequencesPageContent />;
}
