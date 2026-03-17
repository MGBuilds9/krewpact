import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
        <Skeleton className="col-span-1 md:col-span-4 lg:col-span-4 h-48 rounded-3xl" />
        <div className="col-span-1 md:col-span-4 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
        </div>
        <Skeleton className="col-span-1 md:col-span-2 lg:col-span-2 h-24 rounded-3xl" />
        <Skeleton className="col-span-1 md:col-span-2 lg:col-span-2 h-24 rounded-3xl" />
        <div className="col-span-1 md:col-span-4 lg:col-span-2 grid grid-cols-2 gap-4">
          {['qa', 'qb', 'qc', 'qd'].map((id) => (
            <Skeleton key={id} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-64 rounded-3xl" />
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
