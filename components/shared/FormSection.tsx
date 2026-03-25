import React from 'react';

import { cn } from '@/lib/utils';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      <div className="border-b pb-3 mb-4">
        <legend className="text-base font-semibold text-foreground">{title}</legend>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
