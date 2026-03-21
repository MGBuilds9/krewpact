import { RoleGuard } from '@/components/Auth/RoleGuard';
import { EstimatesNav } from '@/components/Estimates/EstimatesNav';

export default function EstimatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard permission="estimates.view">
      <EstimatesNav />
      {children}
    </RoleGuard>
  );
}
