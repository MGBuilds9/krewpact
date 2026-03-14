import { RoleGuard } from '@/components/Auth/RoleGuard';

export default function EstimatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard permission="estimates.view">
      {children}
    </RoleGuard>
  );
}
