import { RoleGuard } from '@/components/Auth/RoleGuard';
import { FeatureGate } from '@/components/shared/FeatureGate';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate flag="reports">
      <RoleGuard permission="reports.view">{children}</RoleGuard>
    </FeatureGate>
  );
}
