import { FeatureGate } from '@/components/shared/FeatureGate';

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate flag="payroll">{children}</FeatureGate>;
}
