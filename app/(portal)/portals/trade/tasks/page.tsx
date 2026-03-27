import type { Metadata } from 'next';

import PageContent from './_page-content';

export const metadata: Metadata = {
  title: 'My Tasks',
  description: 'View and update your assigned project tasks.',
};

export default function TasksPage() {
  return <PageContent />;
}
