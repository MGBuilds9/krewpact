'use client';

import { useMemo } from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCalendarEvents } from '@/hooks/useCalendar';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/date';

function getTodayRange(): { startDateTime: string; endDateTime: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
  };
}

function formatEventTime(dateTimeStr: string): string {
  return formatTime(dateTimeStr, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function CalendarWidgetSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-4 p-3">
          <div className="space-y-1 flex-shrink-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CalendarWidget(): React.ReactElement {
  const { startDateTime, endDateTime } = useMemo(() => getTodayRange(), []);

  const { data, isLoading, error } = useCalendarEvents({
    startDateTime,
    endDateTime,
    top: 10,
  });

  const events = data?.value ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Today&apos;s Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <CalendarWidgetSkeleton />}

        {error && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Microsoft 365 not connected</p>
            <p className="text-xs mt-1">Connect your M365 account to see today&apos;s schedule</p>
          </div>
        )}

        {!isLoading && !error && events.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No events today</p>
          </div>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div className="space-y-1">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 text-right min-w-[4.5rem]">
                  {event.isAllDay ? (
                    <Badge variant="secondary" className="text-xs">
                      All day
                    </Badge>
                  ) : (
                    <>
                      <p className="text-sm font-medium">{formatEventTime(event.start.dateTime)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventTime(event.end.dateTime)}
                      </p>
                    </>
                  )}
                </div>
                <div
                  className={cn(
                    'w-0.5 self-stretch rounded-full flex-shrink-0',
                    event.isAllDay ? 'bg-blue-400' : 'bg-primary',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.subject}</p>
                  {event.location?.displayName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {event.location.displayName}
                    </p>
                  )}
                  {event.onlineMeetingUrl && (
                    <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      Online meeting
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
