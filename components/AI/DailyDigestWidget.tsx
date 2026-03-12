'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DigestSection {
  title: string;
  items: Array<{ label: string; value: string; url?: string }>;
}

interface Digest {
  id: string;
  summary: string;
  sections: DigestSection[];
  digest_date: string;
}

export function DailyDigestWidget() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/ai/digest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { digest: Digest | null } | null) => {
        if (data?.digest) setDigest(data.digest);
      })
      .catch(() => {});
  }, []);

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
            {digest.sections.map((section, i) => (
              <div key={i}>
                <h4 className="text-sm font-semibold">{section.title}</h4>
                <ul className="mt-1 space-y-1">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-baseline justify-between gap-2 text-sm">
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
