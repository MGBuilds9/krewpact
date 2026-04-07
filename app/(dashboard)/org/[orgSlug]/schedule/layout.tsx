import { FeatureGate } from '@/components/shared/FeatureGate';

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate flag="schedule">{children}</FeatureGate>;
}
