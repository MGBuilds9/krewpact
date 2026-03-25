import { Skeleton } from '@/components/ui/skeleton';

export default function ScheduleLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {['c-1', 'c-2', 'c-3'].map((id) => (
          <Skeleton key={id} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
