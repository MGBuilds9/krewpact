'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface ForecastQuarter {
  quarter: string;
  signed: number;
  weighted: number;
  total: number;
  isCurrent: boolean;
}

interface ForecastChartProps {
  forecast?: ForecastQuarter[];
  isLoading?: boolean;
}

function formatCAD(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

interface CustomTooltipPayloadEntry {
  dataKey?: string | number;
  value?: number;
}

interface CustomTooltipArgs {
  active?: boolean;
  payload?: CustomTooltipPayloadEntry[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipArgs) {
  if (!active || !payload || payload.length === 0) return null;

  const signed = (payload.find((p) => p.dataKey === 'signed')?.value ?? 0) as number;
  const weighted = (payload.find((p) => p.dataKey === 'weighted')?.value ?? 0) as number;
  const total = signed + weighted;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
            Signed
          </span>
          <span className="font-medium tabular-nums">{formatCAD(signed)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-blue-400" />
            Pipeline
          </span>
          <span className="font-medium tabular-nums">{formatCAD(weighted)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t mt-1 pt-1">
          <span className="font-semibold">Total</span>
          <span className="font-semibold tabular-nums">{formatCAD(total)}</span>
        </div>
      </div>
    </div>
  );
}

export function ForecastChart({ forecast, isLoading = false }: ForecastChartProps) {
  const currentQuarter = forecast?.find((q) => q.isCurrent)?.quarter;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Revenue Forecast</CardTitle>
        <p className="text-xs text-muted-foreground">
          Signed contracts + probability-weighted pipeline by quarter
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-md" />
        ) : !forecast || forecast.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No forecast data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>
            <AreaChart data={forecast} margin={{ top: 4, right: 4, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="signedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="weightedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={formatCAD}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip
                content={(props) => <CustomTooltip {...(props as unknown as CustomTooltipArgs)} />}
              />
              {currentQuarter && (
                <ReferenceLine
                  x={currentQuarter}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: 'Now', fontSize: 10, fill: '#f59e0b', position: 'top' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="signed"
                stackId="1"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#signedGradient)"
                name="Signed"
              />
              <Area
                type="monotone"
                dataKey="weighted"
                stackId="1"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#weightedGradient)"
                name="Pipeline"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
