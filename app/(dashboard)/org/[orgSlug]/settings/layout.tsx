import { RoleGuard } from '@/components/Auth/RoleGuard';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard permission="admin.edit">
      {children}
    </RoleGuard>
  );
}
