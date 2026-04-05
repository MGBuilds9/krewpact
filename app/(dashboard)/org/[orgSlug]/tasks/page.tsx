import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/PageHeader';

export const metadata: Metadata = { title: 'Tasks | KrewPact' };

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Cross-project task management" />
      <p className="text-sm text-muted-foreground">
        Task management is available within each project. Use the sidebar to navigate to a specific
        project.
      </p>
    </div>
  );
}
