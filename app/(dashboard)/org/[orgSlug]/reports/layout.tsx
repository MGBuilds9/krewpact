import { RoleGuard } from '@/components/Auth/RoleGuard';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard permission="reports.view">{children}</RoleGuard>;
}
