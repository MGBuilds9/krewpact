import { RoleGuard } from '@/components/Auth/RoleGuard';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard permission="finance.view">
      {children}
    </RoleGuard>
  );
}
