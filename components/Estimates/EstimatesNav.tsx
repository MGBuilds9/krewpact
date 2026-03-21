'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useOrgRouter } from '@/hooks/useOrgRouter';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Estimates', segment: '' },
  { label: 'Assemblies', segment: '/assemblies' },
  { label: 'Catalog', segment: '/catalog' },
  { label: 'Templates', segment: '/templates' },
] as const;

export function EstimatesNav() {
  const pathname = usePathname();
  const { orgPath } = useOrgRouter();
  const basePath = orgPath('/estimates');

  // Hide tabs on detail ([id]) and creation (new) pages
  const relativePath = pathname.replace(basePath, '');
  const isSubPage =
    relativePath.length > 0 &&
    !relativePath.startsWith('/assemblies') &&
    !relativePath.startsWith('/catalog') &&
    !relativePath.startsWith('/templates');

  if (isSubPage) return null;

  return (
    <nav className="border-b mb-6">
      <div className="flex gap-4">
        {TABS.map((tab) => {
          const href = `${basePath}${tab.segment}`;
          const isActive =
            tab.segment === ''
              ? pathname === basePath
              : pathname.startsWith(`${basePath}${tab.segment}`);

          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                'px-1 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
