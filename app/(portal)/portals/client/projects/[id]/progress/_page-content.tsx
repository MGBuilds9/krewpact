'use client';

import { useParams } from 'next/navigation';

import { ProgressTimeline } from '@/components/Portals/ProgressTimeline';
import { usePortalProgress } from '@/hooks/usePortalProject';

function ProgressSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-16 rounded-xl bg-gray-100" />
      <div className="h-10 rounded-lg bg-gray-100 w-3/4" />
      <div className="h-10 rounded-lg bg-gray-100 w-1/2" />
      <div className="h-10 rounded-lg bg-gray-100 w-2/3" />
    </div>
  );
}

export default function ProgressPageContent() {
  const { id: projectId } = useParams<{ id: string }>();
  const { data, loading, error } = usePortalProgress(projectId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Project Progress</h2>
      </div>
      {loading && <ProgressSkeleton />}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {!loading && !error && data && (
        <ProgressTimeline milestones={data.milestones} tasks={data.tasks} summary={data.summary} />
      )}
    </div>
  );
}
