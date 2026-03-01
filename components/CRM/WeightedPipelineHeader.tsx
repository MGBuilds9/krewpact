'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Briefcase } from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

export interface WeightedPipelineHeaderProps {
  totalValue: number;
  weightedValue: number;
  opportunityCount: number;
}

export function WeightedPipelineHeader({
  totalValue,
  weightedValue,
  opportunityCount,
}: WeightedPipelineHeaderProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pipeline</p>
            <p className="text-lg font-semibold">{formatCurrency(totalValue)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Weighted Pipeline</p>
            <p className="text-lg font-semibold">{formatCurrency(weightedValue)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
            <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Opportunities</p>
            <p className="text-lg font-semibold">{opportunityCount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
