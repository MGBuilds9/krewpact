import type { Metadata } from 'next';

import ScoringPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Scoring Settings',
  description: 'Configure lead scoring weights and thresholds.',
};

export default function Page() {
  return <ScoringPageContent />;
}
