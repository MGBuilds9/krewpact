import { Skeleton } from '@/components/ui/skeleton';

export default function AccountsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-3">
        {['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => (
          <Skeleton key={id} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
