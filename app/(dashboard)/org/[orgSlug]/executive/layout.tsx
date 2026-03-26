import { ExecutiveNav } from '@/components/Executive/ExecutiveNav';
import { RoleGuard } from '@/components/Auth/RoleGuard';

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard permission="reports.view">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Nucleus</h1>
          <p className="text-sm text-muted-foreground mt-1">MDM Group operational intelligence</p>
        </div>
        <ExecutiveNav />
        {children}
      </div>
    </RoleGuard>
  );
}
