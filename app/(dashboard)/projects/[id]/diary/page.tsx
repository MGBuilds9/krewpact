'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SiteDiaryEntryForm } from '@/components/Projects/SiteDiaryEntryForm';
import { DailyLogForm } from '@/components/Projects/DailyLogForm';
import { useSiteDiary, useDailyLogs } from '@/hooks/useProjectExtended';
import { Plus, BookOpen, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

const entryTypeBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  safety: 'destructive',
  weather: 'outline',
  progress: 'default',
  observation: 'secondary',
  visitor: 'secondary',
  delivery: 'secondary',
  other: 'outline',
};

export default function ProjectDiaryPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [open, setOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const { data, isLoading } = useSiteDiary(projectId, { limit, offset });
  const { data: logsData, isLoading: logsLoading } = useDailyLogs(projectId, { limit: 10, offset: 0 });

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Site Diary
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {total} {total === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Diary Entry</DialogTitle>
            </DialogHeader>
            <SiteDiaryEntryForm
              projectId={projectId}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No diary entries yet</p>
          <p className="text-sm">Start recording site observations, deliveries, and more.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant={entryTypeBadgeVariant[entry.entry_type] ?? 'secondary'}>
                    {entry.entry_type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(entry.entry_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{entry.entry_text}</p>
            </div>
          ))}

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

      {/* Daily Logs Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Daily Logs
          </CardTitle>
          <Button size="sm" onClick={() => setLogDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Log
          </Button>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : (logsData?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No daily logs recorded.</p>
          ) : (
            <div className="space-y-2">
              {(logsData?.data ?? []).map((log) => (
                <div key={log.id} className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{format(new Date(log.log_date), 'MMM d, yyyy')}</span>
                    {log.crew_count != null && (
                      <span className="text-muted-foreground">{log.crew_count} crew</span>
                    )}
                  </div>
                  {log.work_summary && <p className="text-muted-foreground">{log.work_summary}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Log Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Daily Log</DialogTitle>
          </DialogHeader>
          <DailyLogForm
            projectId={projectId}
            onSuccess={() => setLogDialogOpen(false)}
            onCancel={() => setLogDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
