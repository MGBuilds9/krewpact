import type { Metadata } from 'next';

import ProgressPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Project Progress',
  description: 'Track milestones and overall project progress.',
};

export default function Page() {
  return <ProgressPageContent />;
}
