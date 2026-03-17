import { ComingSoon } from '@/components/ui/coming-soon';
import { type FeatureKey, isFeatureEnabled } from '@/lib/feature-flags';

interface FeatureGateProps {
  feature: FeatureKey;
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function FeatureGate({ feature, label, description, children }: FeatureGateProps) {
  if (!isFeatureEnabled(feature)) {
    return <ComingSoon feature={label} description={description} />;
  }
  return <>{children}</>;
}
