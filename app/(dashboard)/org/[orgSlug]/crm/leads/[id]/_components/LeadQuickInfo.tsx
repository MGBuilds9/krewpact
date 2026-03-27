'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { useLead } from '@/hooks/useCRM';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';

type LeadData = NonNullable<ReturnType<typeof useLead>['data']>;

interface LeadQuickInfoProps {
  lead: LeadData;
  contactCount: number;
  activityCount: number;
}

export function LeadQuickInfo({ lead, contactCount, activityCount }: LeadQuickInfoProps) {
  const isOverdue = lead.next_followup_at && new Date(lead.next_followup_at) < new Date();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {lead.source_channel && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Source</span>
            <span>{formatStatus(lead.source_channel)}</span>
          </div>
        )}
        {lead.next_followup_at && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Next Follow-up</span>
            <span className={cn(isOverdue ? 'text-red-600 font-medium' : '')}>
              {new Date(lead.next_followup_at).toLocaleDateString('en-CA', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Contacts</span>
          <span>{contactCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Activities</span>
          <span>{activityCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}
