'use client';

import dynamic from 'next/dynamic';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { useLead } from '@/hooks/useCRM';
import { formatStatus } from '@/lib/format-status';

const LeadForm = dynamic(() => import('@/components/CRM/LeadForm').then((m) => m.LeadForm), {
  loading: () => <Skeleton className="h-48 w-full rounded-xl" />,
});

type LeadData = NonNullable<ReturnType<typeof useLead>['data']>;

interface LeadInfoCardProps {
  lead: LeadData;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
}

export function LeadInfoCard({ lead, isEditing, setIsEditing }: LeadInfoCardProps) {
  const location = lead.city ? `${lead.city}${lead.province ? `, ${lead.province}` : ''}` : '-';
  const lastActivity = lead.last_touch_at
    ? new Date(lead.last_touch_at).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-';
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Lead' : 'Lead Information'}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <LeadForm
            lead={lead}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd className="text-sm">{formatStatus(lead.status)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Industry</dt>
              <dd className="text-sm">{lead.industry || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Source</dt>
              <dd className="text-sm">{formatStatus(lead.source_channel) || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Location</dt>
              <dd className="text-sm">{location}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="text-sm">
                {new Date(lead.created_at).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Last Activity</dt>
              <dd className="text-sm">{lastActivity}</dd>
            </div>
            {lead.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
                <dd className="text-sm whitespace-pre-wrap">{lead.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
