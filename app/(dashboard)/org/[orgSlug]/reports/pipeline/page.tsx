import type { Metadata } from 'next';

import PipelinePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Pipeline Report',
  description: 'Sales pipeline value, stage distribution, and velocity metrics.',
};

export default function Page() {
  return <PipelinePageContent />;
}
