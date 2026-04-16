import { RoleGuard } from '@/components/Auth/RoleGuard';
import { FeatureGate } from '@/components/shared/FeatureGate';

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate flag="documents">
      <RoleGuard permission="projects.view">{children}</RoleGuard>
    </FeatureGate>
  );
}
