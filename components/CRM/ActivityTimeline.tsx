'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Phone, Mail, Calendar, StickyNote, ListTodo } from 'lucide-react';
import type { Activity } from '@/hooks/useCRM';

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: StickyNote,
  task: ListTodo,
};

const activityColors: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700 border-blue-200',
  email: 'bg-purple-100 text-purple-700 border-purple-200',
  meeting: 'bg-green-100 text-green-700 border-green-200',
  note: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  task: 'bg-orange-100 text-orange-700 border-orange-200',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <StickyNote className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>No activities yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.activity_type] || StickyNote;
        const colorClass =
          activityColors[activity.activity_type] || 'bg-gray-100 text-gray-700 border-gray-200';

        return (
          <div key={activity.id} className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border',
                  colorClass,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-sm">{activity.title}</span>
                <Badge variant="outline" className="text-xs">
                  {activity.activity_type}
                </Badge>
              </div>
              {activity.details && (
                <p className="text-sm text-muted-foreground mb-1">{activity.details}</p>
              )}
              <time className="text-xs text-muted-foreground">
                {formatDate(activity.created_at)}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}
