'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FeatureGate } from '@/components/shared/FeatureGate';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { cn } from '@/lib/utils';

const inventoryTabs = [
  { label: 'Overview', href: '/inventory' },
  { label: 'Items', href: '/inventory/items' },
  { label: 'Locations', href: '/inventory/locations' },
  { label: 'Purchase Orders', href: '/inventory/purchase-orders' },
  { label: 'Receiving', href: '/inventory/receive' },
  { label: 'Transactions', href: '/inventory/transactions' },
  { label: 'Fleet', href: '/inventory/fleet' },
  { label: 'Adjustments', href: '/inventory/adjustments' },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { orgPath } = useOrgRouter();
  const strippedPath = pathname.replace(/^\/org\/[^/]+/, '');

  return (
    <FeatureGate flag="inventory">
      <div className="space-y-6">
        <nav className="inline-flex h-auto items-center justify-start rounded-md bg-muted p-1 text-muted-foreground flex-wrap gap-0.5">
          {inventoryTabs.map((tab) => {
            const isActive =
              tab.href === '/inventory'
                ? strippedPath === '/inventory'
                : strippedPath === tab.href || strippedPath.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.href}
                href={orgPath(tab.href)}
                prefetch={false}
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
    </FeatureGate>
  );
}
