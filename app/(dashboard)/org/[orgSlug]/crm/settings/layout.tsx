import { RoleGuard } from '@/components/Auth/RoleGuard';

export default function CrmSettingsLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard permission="crm.admin">{children}</RoleGuard>;
}
