import { Skeleton } from '@/components/ui/skeleton';

export default function PortalLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-4 md:grid-cols-2">
        {['card-1', 'card-2', 'card-3', 'card-4'].map((id) => (
          <div key={id} className="rounded-xl border p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
