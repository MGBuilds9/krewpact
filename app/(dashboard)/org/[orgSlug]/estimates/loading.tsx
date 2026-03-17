import { Skeleton } from '@/components/ui/skeleton';

export default function EstimatesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-lg border">
        <Skeleton className="h-10 w-full" />
        {['r-1', 'r-2', 'r-3', 'r-4', 'r-5', 'r-6'].map((id) => (
          <Skeleton key={id} className="h-16 w-full border-t" />
        ))}
      </div>
    </div>
  );
}
