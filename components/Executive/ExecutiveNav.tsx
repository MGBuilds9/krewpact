'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BookOpen, Upload, MessageSquare, CreditCard } from 'lucide-react';

const NAV_ITEMS = [
  { href: '', label: 'Command Center', icon: LayoutDashboard },
  { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { href: '/knowledge/ingest', label: 'Ingestion', icon: Upload },
  { href: '/knowledge/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
] as const;

export function ExecutiveNav() {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const basePath = `/org/${orgSlug}/executive`;

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2" aria-label="Executive navigation">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const fullHref = `${basePath}${href}`;
        const isActive =
          href === ''
            ? pathname === basePath || pathname === `${basePath}/`
            : pathname.startsWith(fullHref);

        return (
          <Link
            key={href}
            href={fullHref}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
