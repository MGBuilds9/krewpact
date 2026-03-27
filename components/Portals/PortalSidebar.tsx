'use client';

import {
  CheckSquare,
  ClipboardList,
  FileText,
  FolderOpen,
  Gavel,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const TRADE_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/portals/trade', icon: LayoutDashboard },
  { label: 'Compliance', href: '/portals/trade/compliance', icon: CheckSquare },
  { label: 'Bids', href: '/portals/trade/bids', icon: Gavel },
  { label: 'Tasks', href: '/portals/trade/tasks', icon: ClipboardList },
  { label: 'Submittals', href: '/portals/trade/submittals', icon: FileText },
];

const CLIENT_NAV: NavItem[] = [
  { label: 'Projects', href: '/portals/client/projects', icon: FolderOpen },
];

interface PortalSidebarProps {
  roles: string[];
}

export function PortalSidebar({ roles }: PortalSidebarProps) {
  const pathname = usePathname();

  const isTrade = roles.some((r) => r === 'trade_partner_admin' || r === 'trade_partner_user');
  const isClient = roles.some((r) => r === 'client_owner' || r === 'client_delegate');

  const navItems: NavItem[] = isTrade ? TRADE_NAV : isClient ? CLIENT_NAV : [];

  if (navItems.length === 0) return null;

  return (
    <aside className="hidden sm:flex flex-col w-56 border-r border-border/50 bg-background shrink-0">
      <nav className="flex flex-col gap-1 p-3 pt-4" aria-label="Portal navigation">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === '/portals/trade'
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn('h-4 w-4 shrink-0', isActive ? 'text-amber-500' : '')}
                aria-hidden="true"
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
