'use client';

import {
  Banknote,
  BarChart3,
  Building2,
  Calculator,
  Calendar,
  ChevronDown,
  ClipboardList,
  DollarSign,
  FileText,
  FolderOpen,
  Home,
  Package,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrg } from '@/contexts/OrgContext';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useUserRBAC } from '@/hooks/useRBAC';
import { cn } from '@/lib/utils';

const MAX_VISIBLE_DESKTOP = 10;
const MAX_VISIBLE_MOBILE = 7;

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
  requiredFlag?: string;
}

const navigationItems: NavItem[] = [
  {
    icon: Home,
    label: 'Dashboard',
    path: '/dashboard',
    description: 'Service gateway & quick access',
  },
  { icon: Building2, label: 'CRM', path: '/crm', description: 'Leads, accounts & pipeline', requiredFlag: 'crm' },
  {
    icon: Calculator,
    label: 'Estimates',
    path: '/estimates',
    description: 'Cost estimation builder',
    requiredFlag: 'estimates',
  },
  {
    icon: FolderOpen,
    label: 'Projects',
    path: '/projects',
    description: 'View construction projects',
    requiredFlag: 'projects',
  },
  {
    icon: FileText,
    label: 'Documents',
    path: '/documents',
    description: 'SharePoint files & documents',
    requiredFlag: 'documents',
  },
  {
    icon: Package,
    label: 'Inventory',
    path: '/inventory',
    description: 'Items, stock & purchasing',
    requiredFlag: 'inventory',
  },
  {
    icon: Calendar,
    label: 'Schedule',
    path: '/schedule',
    description: 'Calendar & events',
    requiredFlag: 'schedule',
  },
  { icon: Users, label: 'Team', path: '/team', description: 'Employee directory' },
  {
    icon: DollarSign,
    label: 'Finance',
    path: '/finance',
    description: 'Financial overview',
    requiredFlag: 'finance',
  },
  {
    icon: Banknote,
    label: 'Payroll',
    path: '/payroll',
    description: 'ADP payroll export & timesheets',
    requiredRoles: ['payroll_admin', 'executive', 'accounting'],
    requiredFlag: 'payroll',
  },
  {
    icon: ClipboardList,
    label: 'Reports',
    path: '/reports',
    description: 'Field & safety reports',
    requiredFlag: 'reports',
  },
  {
    icon: BarChart3,
    label: 'Executive',
    path: '/executive',
    description: 'Executive dashboard',
    requiredRoles: ['executive', 'platform_admin'],
    requiredFlag: 'executive',
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

function MobileNav({
  items,
  strippedPath,
  orgPath,
}: {
  items: NavItem[];
  strippedPath: string;
  orgPath: (p: string) => string;
}) {
  return (
    <nav className="flex flex-col gap-2">
      {items.map((item) => {
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

// eslint-disable-next-line max-lines-per-function
function DesktopNav({
  items,
  strippedPath,
  orgPath,
}: {
  items: NavItem[];
  strippedPath: string;
  orgPath: (p: string) => string;
}) {
  const visibleItems = items.slice(0, MAX_VISIBLE_DESKTOP);
  const overflowItems = items.slice(MAX_VISIBLE_DESKTOP);
  const hasOverflowActive = overflowItems.some(
    (item) => strippedPath === item.path || strippedPath.startsWith(item.path + '/'),
  );
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-start gap-1 w-full relative overflow-hidden min-w-0">
        {visibleItems.map((item) => {
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
        {overflowItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={hasOverflowActive ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium shrink-0',
                  hasOverflowActive && 'shadow-md font-bold',
                )}
              >
                More
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {overflowItems.map((item) => {
                const href = orgPath(item.path);
                const isActive =
                  strippedPath === item.path || strippedPath.startsWith(item.path + '/');
                return (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center gap-3 cursor-pointer',
                        isActive && 'bg-accent font-semibold',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );
}

export function Navigation({ isMobile = false }: NavigationProps) {
  const pathname = usePathname();
  const { orgPath } = useOrgRouter();
  const { isAdmin, hasRole } = useUserRBAC();
  const { currentOrg } = useOrg();
  const flags = currentOrg?.feature_flags ?? {};

  const filteredItems = useMemo(
    () =>
      navigationItems.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.requiredRoles && !item.requiredRoles.some((r) => hasRole(r)) && !isAdmin)
          return false;
        if (item.requiredFlag && !flags[item.requiredFlag] && !isAdmin) return false;
        return true;
      }),
    [isAdmin, hasRole, flags],
  );

  const strippedPath = pathname.replace(/^\/org\/[^/]+/, '');
  if (isMobile)
    return (
      <MobileNav
        items={filteredItems.slice(0, MAX_VISIBLE_MOBILE)}
        strippedPath={strippedPath}
        orgPath={orgPath}
      />
    );
  return <DesktopNav items={filteredItems} strippedPath={strippedPath} orgPath={orgPath} />;
}
