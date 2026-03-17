import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-32" />
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="space-y-2">
          {['nav-1', 'nav-2', 'nav-3', 'nav-4', 'nav-5', 'nav-6'].map((id) => (
            <Skeleton key={id} className="h-9 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
