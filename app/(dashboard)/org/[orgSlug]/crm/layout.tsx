'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { GlobalSearch } from '@/components/CRM/GlobalSearch';
import { useOrgRouter } from '@/hooks/useOrgRouter';

const crmTabs = [
  { label: 'Dashboard', href: '/crm/dashboard' },
  { label: 'Tasks', href: '/crm/tasks' },
  { label: 'Leads', href: '/crm/leads' },
  { label: 'Accounts', href: '/crm/accounts' },
  { label: 'Contacts', href: '/crm/contacts' },
  { label: 'Opportunities', href: '/crm/opportunities' },
  { label: 'Bidding', href: '/crm/bidding' },
  { label: 'Sequences', href: '/crm/sequences' },
  { label: 'Settings', href: '/crm/settings' },
];

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { orgPath } = useOrgRouter();
  const strippedPath = pathname.replace(/^\/org\/[^/]+/, '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground">
            Manage leads, accounts, contacts, and opportunities
          </p>
        </div>
        <GlobalSearch />
      </div>

      <nav className="inline-flex h-auto items-center justify-start rounded-md bg-muted p-1 text-muted-foreground flex-wrap gap-0.5">
        {crmTabs.map((tab) => {
          const isActive = strippedPath === tab.href || strippedPath.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={orgPath(tab.href)}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:bg-background/50 hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
