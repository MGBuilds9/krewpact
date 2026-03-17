import type { Metadata } from 'next';

import PmPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Project Manager Dashboard',
  description: 'Active projects, milestones, and team workload for project managers.',
};

export default function Page() {
  return <PmPageContent />;
}
