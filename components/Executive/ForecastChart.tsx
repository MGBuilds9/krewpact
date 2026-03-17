'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';

export interface ForecastQuarter {
  quarter: string;
  signed: number;
  weighted: number;
  total: number;
  isCurrent: boolean;
}

export interface ForecastChartProps {
  forecast?: ForecastQuarter[];
  isLoading?: boolean;
}

export const ForecastChart = dynamic(
  () => import('./ForecastChartInner').then((m) => ({ default: m.ForecastChartInner })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[350px] w-full rounded-md" />,
  },
);
