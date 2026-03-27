import { RoleGuard } from '@/components/Auth/RoleGuard';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard permission="projects.view">{children}</RoleGuard>;
}
