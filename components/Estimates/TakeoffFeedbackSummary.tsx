'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Edit3, MessageSquare, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

interface FeedbackSummary {
  total: number;
  accepted: number;
  corrected: number;
  rejected: number;
  missed: number;
  acceptance_rate: number;
}

interface TakeoffFeedbackSummaryProps {
  estimateId: string;
  jobId: string;
}

export function TakeoffFeedbackSummary({ estimateId, jobId }: TakeoffFeedbackSummaryProps) {
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.takeoff.job(estimateId, jobId), 'feedback'],
    queryFn: () =>
      apiFetch<FeedbackSummary>(`/api/estimates/${estimateId}/takeoff/${jobId}/feedback`),
    staleTime: 60_000,
  });

  if (isLoading || !data || data.total === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">AI Takeoff Results</CardTitle>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {data.acceptance_rate}% acceptance
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>{data.accepted} accepted</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-700">
            <Edit3 className="h-4 w-4" />
            <span>{data.corrected} edited</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-700">
            <XCircle className="h-4 w-4" />
            <span>{data.rejected} rejected</span>
          </div>
          {data.missed > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{data.missed} missed</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Feedback sent to engine for training improvement.
        </p>
      </CardContent>
    </Card>
  );
}
