'use client';

import { Plus } from 'lucide-react';

import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { useActivities } from '@/hooks/useCRM';

type ActivityItem = NonNullable<ReturnType<typeof useActivities>['data']>['data'][number];

interface LeadActivityCardProps {
  activities: ActivityItem[];
  onLogActivity: () => void;
}

export function LeadActivityCard({ activities, onLogActivity }: LeadActivityCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activity Timeline</CardTitle>
        <Button size="sm" variant="outline" onClick={onLogActivity}>
          <Plus className="h-4 w-4 mr-1" />
          Log Activity
        </Button>
      </CardHeader>
      <CardContent>
        <ActivityTimeline activities={activities} />
      </CardContent>
    </Card>
  );
}
