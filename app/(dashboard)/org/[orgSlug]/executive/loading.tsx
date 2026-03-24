import { Skeleton } from '@/components/ui/skeleton';

export default function ExecutiveLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['c-1', 'c-2', 'c-3', 'c-4'].map((id) => (
          <Skeleton key={id} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <div className="rounded-lg border">
        <Skeleton className="h-10 w-full" />
        {['r-1', 'r-2', 'r-3', 'r-4', 'r-5'].map((id) => (
          <Skeleton key={id} className="h-14 w-full border-t" />
        ))}
      </div>
    </div>
  );
}
