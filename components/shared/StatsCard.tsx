import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatsCardTrend {
  value: number;
  label: string;
}

export interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: StatsCardTrend;
  className?: string;
}

export function StatsCard({ title, value, description, icon, trend, className }: StatsCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              'text-xs mt-1 flex items-center gap-1',
              isPositiveTrend ? 'text-green-600' : 'text-red-600',
            )}
          >
            <span aria-hidden="true">{isPositiveTrend ? '↑' : '↓'}</span>
            <span>
              {isPositiveTrend ? '+' : ''}
              {trend.value}% {trend.label}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
