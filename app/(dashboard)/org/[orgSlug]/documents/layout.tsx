import { FeatureGate } from '@/components/shared/FeatureGate';

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate flag="documents">{children}</FeatureGate>;
}
