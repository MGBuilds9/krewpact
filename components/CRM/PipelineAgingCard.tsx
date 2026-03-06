'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';
import type { PipelineAgingEntry } from '@/lib/crm/pipeline-intelligence';

const stageLabels: Record<string, string> = {
  intake: 'Intake',
  site_visit: 'Site Visit',
  estimating: 'Estimating',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
};

interface PipelineAgingCardProps {
  data: PipelineAgingEntry[];
  isLoading?: boolean;
}

export function PipelineAgingCard({ data, isLoading }: PipelineAgingCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalStalled = data.reduce((sum, d) => sum + d.stalled_count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pipeline Aging
          </CardTitle>
          {totalStalled > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              {totalStalled} stalled
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No active deals</p>
        ) : (
          <div className="space-y-2">
            {data.map((entry) => (
              <div
                key={entry.stage}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{stageLabels[entry.stage] ?? entry.stage}</p>
                  <p className="text-xs text-muted-foreground">{entry.count} deals</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-bold', entry.avg_days > 14 && 'text-red-600')}>
                    {entry.avg_days}d avg
                  </span>
                  {entry.stalled_count > 0 && (
                    <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                      {entry.stalled_count} stalled
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
