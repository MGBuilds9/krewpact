'use client';

import React from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { Home, ChevronDown } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';

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
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: { label: string; path: string }[] = [
      { label: 'Dashboard', path: '/dashboard' },
    ];

    let currentPath = '';
    paths.forEach((segment) => {
      currentPath += `/${segment}`;
      let label = routeLabels[currentPath];
      if (!label) {
        const paramValue = Object.values(params).find((v) => v === segment);
        if (paramValue) {
          label = segment
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        } else {
          label = segment.charAt(0).toUpperCase() + segment.slice(1);
        }
      }
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (pathname === '/dashboard' || pathname === '/') {
    return null;
  }

  return (
    <div className="bg-background border-b">
      <div className="container mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage className="font-semibold text-foreground">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        onClick={() => router.push(crumb.path)}
                        className="cursor-pointer hover:text-primary transition-colors"
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

          <div className="md:hidden flex items-center gap-2 w-full">
            {!isCollapsed ? (
              <Breadcrumb className="flex-1 overflow-x-auto">
                <BreadcrumbList className="flex-nowrap">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.path}>
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem className="whitespace-nowrap">
                        {index === breadcrumbs.length - 1 ? (
                          <BreadcrumbPage className="text-sm">{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            onClick={() => router.push(crumb.path)}
                            className="cursor-pointer text-sm"
                          >
                            {index === 0 && <Home className="h-3 w-3 mr-1 inline" />}
                            {crumb.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
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
