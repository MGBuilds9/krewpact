import { RoleGuard } from '@/components/Auth/RoleGuard';
import { EstimatesNav } from '@/components/Estimates/EstimatesNav';
import { FeatureGate } from '@/components/shared/FeatureGate';

export default function EstimatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate flag="estimates">
      <RoleGuard permission="estimates.view">
        <EstimatesNav />
        {children}
      </RoleGuard>
    </FeatureGate>
  );
}
