import { Skeleton } from '@/components/ui/skeleton';

export default function ContractsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-lg border">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full border-t" />
        ))}
      </div>
    </div>
  );
}
