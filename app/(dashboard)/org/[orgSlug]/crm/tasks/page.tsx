import type { Metadata } from 'next';

import TasksPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'CRM Tasks',
  description: 'View and manage all CRM tasks, follow-ups, and activities.',
};

export default function Page() {
  return <TasksPageContent />;
}
