import { Skeleton } from '@/components/ui/skeleton';

export default function FinanceLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {['c-1', 'c-2', 'c-3'].map((id) => (
          <Skeleton key={id} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="rounded-lg border">
        <Skeleton className="h-10 w-full" />
        {['r-1', 'r-2', 'r-3', 'r-4', 'r-5', 'r-6'].map((id) => (
          <Skeleton key={id} className="h-14 w-full border-t" />
        ))}
      </div>
    </div>
  );
}
