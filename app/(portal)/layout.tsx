import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PortalHeader } from '@/components/Layout/PortalHeader';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { sessionClaims } = await auth();

  // Basic security guard: Ensure user is authenticated
  if (!sessionClaims) {
    redirect('/');
  }

  const claims = sessionClaims as Record<string, unknown>;
  const metadata = (
    (claims.metadata as Record<string, unknown>)
    ?? (claims.public_metadata as Record<string, unknown>)
    ?? claims
  ) as { role_keys?: string[]; krewpact_roles?: string[] } | undefined;

  const roles = metadata?.role_keys ?? metadata?.krewpact_roles ?? [];

  // If they are internal staff, they should probably be on /dashboard, but we'll allow access if they want to view the portal
  // Wait, let's redirect to /dashboard if they have NO client/trade roles
  const isPortalUser = roles.some((r) => r.startsWith('client_') || r.startsWith('trade_'));
  const isInternalUser = roles.some((r) =>
    ['platform_admin', 'project_manager', 'project_coordinator', 'site_superintendent'].includes(r),
  );

  if (!isPortalUser && !isInternalUser) {
    // If they have no valid roles, kick them out
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simplified Portal Header */}
      <PortalHeader />

      {/* Main content grid. Could include a sidebar in the future if needed */}
      <div className="flex-1 flex flex-col sm:flex-row">
        {/* Placeholder for optional Sidebar */}
        {/* <PortalSidebar /> */}

        <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
