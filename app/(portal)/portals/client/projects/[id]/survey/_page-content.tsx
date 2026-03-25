'use client';

import { useParams } from 'next/navigation';

import { SatisfactionSurvey } from '@/components/Portals/SatisfactionSurvey';
import { usePortalSurvey } from '@/hooks/usePortalProject';

function SurveySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 rounded-lg bg-gray-100 w-1/2" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-16 rounded-lg bg-gray-100" />
        <div className="h-16 rounded-lg bg-gray-100" />
        <div className="h-16 rounded-lg bg-gray-100" />
        <div className="h-16 rounded-lg bg-gray-100" />
      </div>
      <div className="h-24 rounded-lg bg-gray-100" />
    </div>
  );
}

export default function SurveyPageContent() {
  const { id: projectId } = useParams<{ id: string }>();
  const { data, loading, error, refetch } = usePortalSurvey(projectId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Satisfaction Survey</h2>
        <p className="text-sm text-gray-500 mt-1">
          We value your feedback. Please rate your experience with this project.
        </p>
      </div>
      {loading && <SurveySkeleton />}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
          <SatisfactionSurvey
            projectId={projectId}
            existingSurvey={data?.survey ?? null}
            onSubmitted={refetch}
          />
        </div>
      )}
    </div>
  );
}
