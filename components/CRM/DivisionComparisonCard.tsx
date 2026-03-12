'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, Trophy } from 'lucide-react';
import type { DivisionComparison } from '@/lib/crm/construction-intelligence';
import { formatCurrencyAbbrev } from '@/lib/date';

type EnrichedDivisionComparison = DivisionComparison & { name?: string };

interface DivisionComparisonCardProps {
  divisions: EnrichedDivisionComparison[];
}

export function DivisionComparisonCard({ divisions }: DivisionComparisonCardProps) {
  if (divisions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Division Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No division data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...divisions.map((d) => d.won_revenue), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Division Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {divisions.map((div, idx) => (
          <div key={div.division_id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {idx === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                <span className="font-medium text-sm">{div.name ?? div.division_id}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{div.total_opportunities} opps</span>
                <Badge
                  variant="outline"
                  className={
                    div.win_rate >= 50
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }
                >
                  {div.win_rate}% win
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="block font-medium text-foreground">
                  {formatCurrencyAbbrev(div.won_revenue)}
                </span>
                Won Revenue
              </div>
              <div>
                <span className="block font-medium text-foreground">
                  {formatCurrencyAbbrev(div.total_pipeline_value)}
                </span>
                Pipeline
              </div>
              <div>
                <span className="block font-medium text-foreground">
                  {formatCurrencyAbbrev(div.avg_deal_size)}
                </span>
                Avg Deal
              </div>
            </div>
            <Progress value={(div.won_revenue / maxRevenue) * 100} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
