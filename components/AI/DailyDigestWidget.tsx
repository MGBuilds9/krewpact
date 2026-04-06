'use client';

import { ChevronDown, ChevronUp, Newspaper } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDigest } from '@/hooks/use-ai';
import { cn } from '@/lib/utils';

export function DailyDigestWidget() {
  const { data: digest } = useDigest();
  const [expanded, setExpanded] = useState(false);

  if (!digest) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="h-4 w-4 text-primary" />
            Daily Brief
          </CardTitle>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label={expanded ? 'Collapse digest' : 'Expand digest'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{digest.summary}</p>

        {expanded && (
          <div className="mt-4 space-y-4">
            {digest.sections.map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-semibold">{section.title}</h4>
                <ul className="mt-1 space-y-1">
                  {section.items.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="truncate text-muted-foreground">{item.label}</span>
                      <span className={cn('shrink-0 font-medium')}>{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
