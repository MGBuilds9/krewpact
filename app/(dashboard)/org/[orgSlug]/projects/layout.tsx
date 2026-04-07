import { RoleGuard } from '@/components/Auth/RoleGuard';
import { FeatureGate } from '@/components/shared/FeatureGate';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate flag="projects">
      <RoleGuard permission="projects.view">{children}</RoleGuard>
    </FeatureGate>
  );
}
