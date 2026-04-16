import { RoleGuard } from '@/components/Auth/RoleGuard';
import { FeatureGate } from '@/components/shared/FeatureGate';

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate flag="schedule">
      <RoleGuard permission="field_ops.view">{children}</RoleGuard>
    </FeatureGate>
  );
}
