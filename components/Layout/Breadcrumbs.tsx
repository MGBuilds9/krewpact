'use client';

import { ChevronDown, Home } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import React from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { useOrgRouter } from '@/hooks/useOrgRouter';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/documents': 'Documents',
  '/schedule': 'Schedule',
  '/team': 'Team',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
  '/admin': 'Admin',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/crm': 'CRM',
  '/crm/leads': 'Leads',
  '/crm/leads/new': 'New Lead',
  '/crm/opportunities': 'Opportunities',
  '/crm/accounts': 'Accounts',
  '/crm/contacts': 'Contacts',
  '/crm/sequences': 'Sequences',
  '/crm/dashboard': 'CRM Dashboard',
};

const contextLabels: Record<string, string> = {
  leads: 'Lead',
  opportunities: 'Opportunity',
  projects: 'Project',
  contacts: 'Contact',
  accounts: 'Account',
  estimates: 'Estimate',
  inventory: 'Item',
  documents: 'Document',
  timesheets: 'Timesheet',
  expenses: 'Expense',
};

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

function buildBreadcrumbs(
  strippedPath: string,
  orgPath: (p: string) => string,
  params: Record<string, string | string[] | undefined>,
) {
  const paths = strippedPath.split('/').filter(Boolean);
  const crumbs: { label: string; path: string }[] = [
    { label: 'Dashboard', path: orgPath('/dashboard') },
  ];
  let currentPath = '';
  paths.forEach((segment) => {
    currentPath += `/${segment}`;
    let label = routeLabels[currentPath];
    if (!label) {
      const paramValue = Object.values(params).find((v) => v === segment);
      if (paramValue) {
        if (UUID_RE.test(segment)) {
          const parentSegment = paths[paths.indexOf(segment) - 1];
          label = contextLabels[parentSegment] || 'Details';
        } else {
          label = segment
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        }
      } else {
        label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }
    }
    crumbs.push({ label, path: orgPath(currentPath) });
  });
  return crumbs;
}

function CrumbList({
  breadcrumbs,
  router,
  className,
  itemClass,
  textClass,
}: {
  breadcrumbs: { label: string; path: string }[];
  router: { push: (p: string) => void };
  className?: string;
  itemClass?: string;
  textClass?: string;
}) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className={itemClass}>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem
              className={itemClass?.includes('flex-nowrap') ? 'whitespace-nowrap' : undefined}
            >
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage className={textClass ?? 'font-semibold text-foreground'}>
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  onClick={() => router.push(crumb.path)}
                  className={`cursor-pointer hover:text-primary transition-colors ${textClass ?? ''}`}
                >
                  {index === 0 && <Home className="h-4 w-4 mr-1 inline" />}
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { orgPath, router } = useOrgRouter();
  const params = useParams();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const orgSlug = params?.orgSlug as string | undefined;
  const orgPrefix = orgSlug ? `/org/${orgSlug}` : '';
  const strippedPath = orgPrefix ? pathname.replace(orgPrefix, '') || '/' : pathname;

  if (strippedPath === '/dashboard' || strippedPath === '/' || strippedPath === '') return null;

  const breadcrumbs = buildBreadcrumbs(
    strippedPath,
    orgPath,
    params as Record<string, string | string[] | undefined>,
  );

  return (
    <div className="bg-background border-b">
      <div className="container mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <CrumbList breadcrumbs={breadcrumbs} router={router} className="hidden md:block" />
          <div className="md:hidden flex items-center gap-2 w-full">
            {!isCollapsed ? (
              <CrumbList
                breadcrumbs={breadcrumbs}
                router={router}
                className="flex-1 overflow-x-auto"
                itemClass="flex-nowrap"
                textClass="text-sm"
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(false)}
                className="text-xs font-semibold"
              >
                <ChevronDown className="h-3 w-3 mr-1" />
                {breadcrumbs[breadcrumbs.length - 1].label}
              </Button>
            )}
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(true)}
                className="ml-auto text-xs"
              >
                Hide
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
