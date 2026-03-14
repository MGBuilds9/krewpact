import { RoleGuard } from '@/components/Auth/RoleGuard';

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard permission="finance.view">
      {children}
    </RoleGuard>
  );
}
