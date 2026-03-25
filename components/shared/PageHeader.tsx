import Link from 'next/link';
import React from 'react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backHref?: string;
  className?: string;
}

export function PageHeader({ title, description, action, backHref, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          ← Back
        </Link>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
