import { Skeleton } from '@/components/ui/skeleton';

export default function ExecutiveLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {['c-1', 'c-2', 'c-3', 'c-4'].map((id) => (
          <Skeleton key={id} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
