import { RoleGuard } from '@/components/Auth/RoleGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard permission="admin.view">{children}</RoleGuard>;
}
