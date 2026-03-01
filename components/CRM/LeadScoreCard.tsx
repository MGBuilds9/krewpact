'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LeadScoreCardProps {
  score: number;
  fitScore?: number;
  intentScore?: number;
  engagementScore?: number;
  onRecalculate?: () => void;
  isRecalculating?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 70) return 'default';
  if (score >= 40) return 'secondary';
  return 'destructive';
}

function getScoreLabel(score: number): string {
  if (score >= 70) return 'Hot';
  if (score >= 40) return 'Warm';
  return 'Cold';
}

export function LeadScoreCard({
  score,
  fitScore = 0,
  intentScore = 0,
  engagementScore = 0,
  onRecalculate,
  isRecalculating = false,
}: LeadScoreCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Lead Score</CardTitle>
          <Badge variant={getScoreBadgeVariant(score)}>{getScoreLabel(score)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <span
            className={`text-4xl font-bold ${getScoreColor(score)}`}
            data-testid="lead-score-value"
          >
            {score}
          </span>
          <span className="text-muted-foreground text-sm ml-1">/ 100</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fit</span>
            <span className="font-medium">{fitScore}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Intent</span>
            <span className="font-medium">{intentScore}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Engagement</span>
            <span className="font-medium">{engagementScore}</span>
          </div>
        </div>

        {onRecalculate && (
          <button
            onClick={onRecalculate}
            disabled={isRecalculating}
            className="mt-4 w-full text-sm text-primary hover:underline disabled:opacity-50"
          >
            {isRecalculating ? 'Recalculating...' : 'Recalculate Score'}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
