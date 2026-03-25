import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {['c-1', 'c-2', 'c-3', 'c-4', 'c-5', 'c-6'].map((id) => (
          <Skeleton key={id} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
