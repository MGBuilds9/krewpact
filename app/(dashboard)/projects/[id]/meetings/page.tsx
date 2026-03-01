'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MeetingMinutesForm } from '@/components/Projects/MeetingMinutesForm';
import { useMeetings } from '@/hooks/useProjectExtended';
import { Plus, Users } from 'lucide-react';
import { format } from 'date-fns';

interface MeetingPayload {
  title?: string;
  attendees?: string[];
  agenda?: string;
  notes?: string;
  action_items?: Array<{ description: string; assignee?: string; due_date?: string }>;
}

export default function ProjectMeetingsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const { data, isLoading } = useMeetings(projectId, { limit, offset });

  const meetings = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Meeting Minutes
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {total} {total === 1 ? 'meeting' : 'meetings'}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Meeting Minutes</DialogTitle>
            </DialogHeader>
            <MeetingMinutesForm
              projectId={projectId}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No meetings recorded</p>
          <p className="text-sm">Record meeting minutes and action items here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            let payload: MeetingPayload = {};
            try {
              payload = JSON.parse(meeting.entry_text) as MeetingPayload;
            } catch {
              payload = { notes: meeting.entry_text };
            }

            return (
              <div key={meeting.id} className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-base">{payload.title ?? 'Meeting'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(meeting.entry_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {payload.attendees && payload.attendees.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Attendees
                    </p>
                    <p className="text-sm">{payload.attendees.join(', ')}</p>
                  </div>
                )}

                {payload.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Notes
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{payload.notes}</p>
                  </div>
                )}

                {payload.action_items && payload.action_items.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Action Items
                    </p>
                    <ul className="space-y-1">
                      {payload.action_items.map((item, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-muted-foreground mt-0.5">•</span>
                          <span>
                            {item.description}
                            {item.assignee && <span className="text-muted-foreground"> — {item.assignee}</span>}
                            {item.due_date && (
                              <span className="text-muted-foreground">
                                {' '}(due {format(new Date(item.due_date), 'MMM d')})
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          {(hasMore || offset > 0) && (
            <div className="flex justify-center gap-2 pt-2">
              {offset > 0 && (
                <Button variant="outline" onClick={() => setOffset(Math.max(0, offset - limit))}>
                  Previous
                </Button>
              )}
              {hasMore && (
                <Button variant="outline" onClick={() => setOffset(offset + limit)}>
                  Load More
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
