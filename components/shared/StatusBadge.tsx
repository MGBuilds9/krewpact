import React from 'react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  active: 'default',
  completed: 'default',
  approved: 'default',
  won: 'default',
  pending: 'secondary',
  draft: 'secondary',
  new: 'secondary',
  in_review: 'secondary',
  overdue: 'destructive',
  rejected: 'destructive',
  lost: 'destructive',
  failed: 'destructive',
  cancelled: 'outline',
  archived: 'outline',
  closed: 'outline',
};

function resolveVariant(status: string): BadgeVariant {
  return STATUS_VARIANT_MAP[status.toLowerCase()] ?? 'secondary';
}

export interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant ?? resolveVariant(status);
  return (
    <Badge variant={resolvedVariant} className={cn(className)}>
      {formatStatus(status)}
    </Badge>
  );
}
