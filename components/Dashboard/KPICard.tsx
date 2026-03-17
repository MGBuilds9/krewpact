'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface KPICardProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
  changePercent?: number;
  icon?: React.ReactNode;
}

export function KPICard({ label, value, trend, changePercent, icon }: KPICardProps) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {trend && changePercent !== undefined && (
          <div
            data-testid="trend-indicator"
            className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              trend === 'up' && 'text-green-600',
              trend === 'down' && 'text-red-600',
              trend === 'flat' && 'text-muted-foreground',
            )}
          >
            {trend === 'up' && <TrendingUp className="h-4 w-4" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4" />}
            {trend === 'flat' && <Minus className="h-4 w-4" />}
            <span>{changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
