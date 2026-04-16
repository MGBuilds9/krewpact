import { RoleGuard } from '@/components/Auth/RoleGuard';
import { FeatureGate } from '@/components/shared/FeatureGate';

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate flag="payroll">
      <RoleGuard permission="finance.view">{children}</RoleGuard>
    </FeatureGate>
  );
}
