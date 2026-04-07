import { RoleGuard } from '@/components/Auth/RoleGuard';
import { FeatureGate } from '@/components/shared/FeatureGate';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate flag="finance">
      <RoleGuard permission="finance.view">{children}</RoleGuard>
    </FeatureGate>
  );
}
