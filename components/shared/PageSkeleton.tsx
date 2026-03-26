import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface PageSkeletonProps {
  layout: 'table' | 'cards' | 'form' | 'dashboard';
  rows?: number;
  columns?: number;
  className?: string;
}

function TableLayout({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="rounded-md border">
        <div className="flex gap-3 px-4 py-3 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={rowIdx}
            className={cn('flex gap-3 px-4 py-3', rowIdx < rows - 1 && 'border-b')}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={colIdx} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardsLayout({ rows = 6, columns = 3 }: { rows?: number; columns?: number }) {
  const count = Math.max(rows, columns);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div
        className={cn(
          'grid gap-4',
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-3',
          columns >= 4 && 'grid-cols-4',
          columns === 1 && 'grid-cols-1',
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FormLayout({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-28" />
    </div>
  );
}

function DashboardLayout({ rows = 4, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-md border">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={rowIdx}
            className={cn('flex gap-3 px-4 py-3', rowIdx < rows - 1 && 'border-b')}
          >
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ layout, rows, columns, className }: PageSkeletonProps) {
  return (
    <div className={cn('p-6', className)}>
      {layout === 'table' && <TableLayout rows={rows} columns={columns} />}
      {layout === 'cards' && <CardsLayout rows={rows} columns={columns} />}
      {layout === 'form' && <FormLayout rows={rows} />}
      {layout === 'dashboard' && <DashboardLayout rows={rows} columns={columns} />}
    </div>
  );
}
