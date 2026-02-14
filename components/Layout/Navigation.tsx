'use client';

import {
  Home,
  FolderOpen,
  FileText,
  Calendar,
  Users,
  Shield,
  DollarSign,
  ClipboardList,
  Building2,
  Calculator,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface NavigationProps {
  isMobile?: boolean;
}

const navigationItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard', description: 'Service gateway & quick access' },
  { icon: Building2, label: 'CRM', href: '/crm', description: 'Leads, accounts & pipeline' },
  { icon: Calculator, label: 'Estimates', href: '/estimates', description: 'Cost estimation builder' },
  { icon: FolderOpen, label: 'Projects', href: '/projects', description: 'View construction projects' },
  { icon: FileText, label: 'Documents', href: '/documents', description: 'SharePoint files & documents' },
  { icon: Calendar, label: 'Schedule', href: '/schedule', description: 'Calendar & events' },
  { icon: Users, label: 'Team', href: '/team', description: 'Employee directory' },
  { icon: DollarSign, label: 'Expenses', href: '/expenses', description: 'Log & manage expenses' },
  { icon: ClipboardList, label: 'Reports', href: '/reports', description: 'Field & safety reports' },
  { icon: Shield, label: 'Admin', href: '/admin', description: 'User & role management', adminOnly: true },
];

export { navigationItems };

export function Navigation({ isMobile = false }: NavigationProps) {
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();

  const filteredItems = navigationItems.filter(
    (item) => !item.adminOnly || currentUser?.role === 'admin',
  );

  if (isMobile) {
    return (
      <nav className="flex flex-col gap-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.label}
              href={item.href}
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
      <div className="flex items-center gap-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md font-bold'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
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
