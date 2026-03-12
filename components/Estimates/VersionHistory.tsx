'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { EstimateVersion } from '@/hooks/useEstimates';
import { formatDate } from '@/lib/date';

interface VersionHistoryProps {
  versions: EstimateVersion[];
}

export function VersionHistory({ versions }: VersionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (versions.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="mx-auto h-8 w-8 opacity-50 mb-2" />
        <p className="text-sm">No versions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => {
        const isExpanded = expandedId === version.id;
        const snapshot = version.snapshot as Record<string, unknown>;

        return (
          <div key={version.id} className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Revision {version.revision_no}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(version.created_at, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedId(isExpanded ? null : version.id)}
                aria-label="View snapshot"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            {version.reason && (
              <p className="text-sm text-muted-foreground mt-1">{version.reason}</p>
            )}
            {isExpanded && snapshot && (
              <div className="mt-3 p-2 bg-muted/30 rounded text-xs font-mono overflow-auto max-h-48">
                <pre>{JSON.stringify(snapshot, null, 2)}</pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
