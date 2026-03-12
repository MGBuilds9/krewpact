'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSequenceEnrollments, useProcessSequences } from '@/hooks/useCRM';
import type { SequenceAnalytics } from '@/app/api/crm/sequences/analytics/route';
import { apiFetch } from '@/lib/api-client';
import { formatDateTime } from '@/lib/date';
import { useQueryClient } from '@tanstack/react-query';

interface SequenceMonitorCardProps {
  analytics: SequenceAnalytics;
}

export function SequenceMonitorCard({ analytics }: SequenceMonitorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();
  const processSequences = useProcessSequences();

  const { data: enrollments } = useSequenceEnrollments(
    analytics.sequence_id,
    expanded ? undefined : undefined,
  );

  const { enrollments: counts } = analytics;
  const completionRate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

  async function handlePauseResume(enrollmentId: string, action: 'pause' | 'resume') {
    await apiFetch(`/api/crm/sequences/enrollments/${enrollmentId}`, {
      method: 'PATCH',
      body: { action },
    });
    queryClient.invalidateQueries({ queryKey: ['sequence-enrollments'] });
    queryClient.invalidateQueries({ queryKey: ['sequence-analytics'] });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{analytics.sequence_name}</CardTitle>
            <Badge
              variant="outline"
              className={
                analytics.is_active
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }
            >
              {analytics.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => processSequences.mutate()}
              disabled={processSequences.isPending}
              title="Process pending steps"
            >
              <RefreshCw
                className={`h-4 w-4 ${processSequences.isPending ? 'animate-spin' : ''}`}
              />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Active:</span>
            <span className="font-medium">{counts.active}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Done:</span>
            <span className="font-medium">{counts.completed}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Pause className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">Paused:</span>
            <span className="font-medium">{counts.paused}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Failed:</span>
            <span className="font-medium">{counts.failed}</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Completion rate</span>
            <span>
              {completionRate}% ({counts.completed}/{counts.total})
            </span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        {/* Steps info */}
        <div className="text-xs text-muted-foreground">
          {analytics.total_steps} step{analytics.total_steps !== 1 ? 's' : ''} in sequence
        </div>

        {/* Expanded: individual enrollment list */}
        {expanded && (
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-sm font-medium">Enrollments</h4>
            {!enrollments || (Array.isArray(enrollments) && enrollments.length === 0) ? (
              <p className="text-sm text-muted-foreground">No enrollments yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(Array.isArray(enrollments) ? enrollments : []).map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          enrollment.status === 'active'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : enrollment.status === 'completed'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : enrollment.status === 'paused'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                        }
                      >
                        {enrollment.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        Step {enrollment.current_step ?? 1}/{analytics.total_steps}
                      </span>
                      {enrollment.next_step_at && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(enrollment.next_step_at, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {enrollment.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handlePauseResume(enrollment.id, 'pause')}
                          title="Pause enrollment"
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                      )}
                      {enrollment.status === 'paused' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handlePauseResume(enrollment.id, 'resume')}
                          title="Resume enrollment"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
