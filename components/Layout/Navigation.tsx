'use client';

import {
  BarChart3,
  Building2,
  Calculator,
  Calendar,
  ClipboardList,
  DollarSign,
  FileText,
  FolderOpen,
  Home,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useUserRBAC } from '@/hooks/useRBAC';
import { type FeatureKey, isFeatureEnabled } from '@/lib/feature-flags';
import { cn } from '@/lib/utils';

interface NavigationProps {
  isMobile?: boolean;
}

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  description: string;
  adminOnly?: boolean;
  requiredRoles?: string[];
  featureFlag?: FeatureKey;
}

const navigationItems: NavItem[] = [
  {
    icon: Home,
    label: 'Dashboard',
    path: '/dashboard',
    description: 'Service gateway & quick access',
  },
  { icon: Building2, label: 'CRM', path: '/crm', description: 'Leads, accounts & pipeline' },
  {
    icon: Calculator,
    label: 'Estimates',
    path: '/estimates',
    description: 'Cost estimation builder',
  },
  {
    icon: FolderOpen,
    label: 'Projects',
    path: '/projects',
    description: 'View construction projects',
  },
  {
    icon: FileText,
    label: 'Documents',
    path: '/documents',
    description: 'SharePoint files & documents',
  },
  {
    icon: Calendar,
    label: 'Schedule',
    path: '/schedule',
    description: 'Calendar & events',
    featureFlag: 'schedule',
  },
  { icon: Users, label: 'Team', path: '/team', description: 'Employee directory' },
  {
    icon: DollarSign,
    label: 'Finance',
    path: '/finance',
    description: 'Financial overview',
    featureFlag: 'finance',
  },
  {
    icon: ClipboardList,
    label: 'Reports',
    path: '/reports',
    description: 'Field & safety reports',
  },
  {
    icon: BarChart3,
    label: 'Executive',
    path: '/executive',
    description: 'Executive dashboard',
    featureFlag: 'executive',
    requiredRoles: ['executive', 'platform_admin'],
  },
  {
    icon: Shield,
    label: 'Admin',
    path: '/admin',
    description: 'User & role management',
    adminOnly: true,
  },
];

export { navigationItems };

export function Navigation({ isMobile = false }: NavigationProps) {
  const pathname = usePathname();
  const { orgPath } = useOrgRouter();
  const { isAdmin, hasRole } = useUserRBAC();

  const filteredItems = useMemo(
    () =>
      navigationItems.filter((item) => {
        if (item.featureFlag && !isFeatureEnabled(item.featureFlag)) return false;
        if (item.adminOnly && !isAdmin) return false;
        if (item.requiredRoles && !item.requiredRoles.some((r) => hasRole(r)) && !isAdmin)
          return false;
        return true;
      }),
    [isAdmin, hasRole],
  );

  const strippedPath = pathname.replace(/^\/org\/[^/]+/, '');

  if (isMobile) {
    return (
      <nav className="flex flex-col gap-2">
        {filteredItems.map((item) => {
          const href = orgPath(item.path);
          const isActive = strippedPath === item.path || strippedPath.startsWith(item.path + '/');
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-target',
                isActive
                  ? 'bg-primary text-primary-foreground font-bold border-l-4 border-primary-foreground/50'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-start gap-1 w-full relative">
        {filteredItems.map((item) => {
          const href = orgPath(item.path);
          const isActive = strippedPath === item.path || strippedPath.startsWith(item.path + '/');
          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-3 lg:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 whitespace-nowrap',
                    'hover:scale-105 active:scale-95',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md font-bold'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
