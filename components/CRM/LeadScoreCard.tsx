'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { RuleResultDisplay } from '@/hooks/useCRM';

interface LeadScoreCardProps {
  score: number;
  fitScore?: number;
  intentScore?: number;
  engagementScore?: number;
  onRecalculate?: () => void;
  isRecalculating?: boolean;
  ruleResults?: RuleResultDisplay[];
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

const CATEGORY_LABELS: Record<string, string> = {
  fit: 'Fit',
  intent: 'Intent',
  engagement: 'Engagement',
};

export function LeadScoreCard({
  score,
  fitScore = 0,
  intentScore = 0,
  engagementScore = 0,
  onRecalculate,
  isRecalculating = false,
  ruleResults,
}: LeadScoreCardProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const matchedRules = ruleResults?.filter((r) => r.matched) ?? [];
  const grouped = matchedRules.reduce<Record<string, RuleResultDisplay[]>>((acc, rule) => {
    const cat = rule.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(rule);
    return acc;
  }, {});

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

        {matchedRules.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setBreakdownOpen((prev) => !prev)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {breakdownOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {breakdownOpen ? 'Hide Breakdown' : 'View Breakdown'}
            </button>

            {breakdownOpen && (
              <div className="mt-3 space-y-3">
                {(['fit', 'intent', 'engagement'] as const).map((cat) => {
                  const catRules = grouped[cat];
                  if (!catRules || catRules.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {CATEGORY_LABELS[cat]}
                      </p>
                      <div className="space-y-1">
                        {catRules.map((rule) => (
                          <div
                            key={rule.rule_id}
                            className="flex justify-between items-center text-xs"
                          >
                            <span className="text-foreground truncate pr-2">{rule.rule_name}</span>
                            <span className="font-medium text-green-600 shrink-0">
                              +{rule.score_impact}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
