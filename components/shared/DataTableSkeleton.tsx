import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DataTableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showPagination?: boolean;
  className?: string;
}

export function DataTableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  showPagination = true,
  className,
}: DataTableSkeletonProps) {
  return (
    <div className={cn('w-full space-y-3', className)}>
      {showHeader && (
        <div className="flex items-center gap-3 pb-1">
          {Array.from({ length: columns }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      )}
      <div className="rounded-md border">
        {Array.from({ length: rows }).map((_, rowIdx) => (
           
          <div
            key={rowIdx}
            className={cn('flex items-center gap-3 px-4 py-3', rowIdx < rows - 1 && 'border-b')}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={colIdx} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
      {showPagination && (
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      )}
    </div>
  );
}
