import type { Metadata } from 'next';

import ScoringPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Lead Scoring Rules',
  description: 'Define and manage lead scoring rules for fit, intent, and engagement.',
};

export default function Page() {
  return <ScoringPageContent />;
}
