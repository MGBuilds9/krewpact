import { Skeleton } from '@/components/ui/skeleton';

export default function OpportunitiesLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {['o1', 'o2', 'o3'].map((id) => (
          <Skeleton key={id} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="flex gap-4 overflow-hidden">
        {['k1', 'k2', 'k3', 'k4'].map((id) => (
          <Skeleton key={id} className="h-48 w-64 flex-shrink-0 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
