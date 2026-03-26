'use client';

import { format } from 'date-fns';
import { BookOpen, ClipboardList, Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { DailyLogForm } from '@/components/Projects/DailyLogForm';
import { SiteDiaryEntryForm } from '@/components/Projects/SiteDiaryEntryForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyLogs, useSiteDiary } from '@/hooks/useProjectExtended';

const entryTypeBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  safety: 'destructive',
  weather: 'outline',
  progress: 'default',
  observation: 'secondary',
  visitor: 'secondary',
  delivery: 'secondary',
  other: 'outline',
};

type DiaryEntry = { id: string; entry_type: string; entry_at: string; entry_text: string };
type DailyLog = {
  id: string;
  log_date: string;
  crew_count?: number | null;
  work_summary?: string | null;
};

function DiaryEntryCard({ entry }: { entry: DiaryEntry }) {
  const variant = entryTypeBadgeVariant[entry.entry_type] || 'secondary';
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant={variant}>{entry.entry_type}</Badge>
          <span className="text-sm text-muted-foreground">
            {format(new Date(entry.entry_at), 'MMM d, yyyy')}
          </span>
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap">{entry.entry_text}</p>
    </div>
  );
}

function DailyLogCard({ log }: { log: DailyLog }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">{format(new Date(log.log_date), 'MMM d, yyyy')}</span>
        {log.crew_count != null && (
          <span className="text-muted-foreground">{log.crew_count} crew</span>
        )}
      </div>
      {log.work_summary && <p className="text-muted-foreground">{log.work_summary}</p>}
    </div>
  );
}

function EntriesList({
  entries,
  hasMore,
  offset,
  onPrev,
  onNext,
}: {
  entries: DiaryEntry[];
  hasMore: boolean;
  offset: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No diary entries yet</p>
        <p className="text-sm">Start recording site observations, deliveries, and more.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <DiaryEntryCard key={entry.id} entry={entry} />
      ))}
      {(hasMore || offset > 0) && (
        <div className="flex justify-center gap-2 pt-2">
          {offset > 0 && (
            <Button variant="outline" onClick={onPrev}>
              Previous
            </Button>
          )}
          {hasMore && (
            <Button variant="outline" onClick={onNext}>
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function LogsSection({ logs, logsLoading }: { logs: DailyLog[]; logsLoading: boolean }) {
  if (logsLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">No daily logs recorded.</p>
    );
  }
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <DailyLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}

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
  const logs = logsData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" />Site Diary</h2>
          <p className="text-muted-foreground text-sm mt-1">{total} {total === 1 ? 'entry' : 'entries'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Entry</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Diary Entry</DialogTitle></DialogHeader>
            <SiteDiaryEntryForm projectId={projectId} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="space-y-3">{['e1','e2','e3','e4','e5'].map((k) => <Skeleton key={k} className="h-20 w-full rounded-xl" />)}</div>
      ) : (
        <EntriesList entries={entries as DiaryEntry[]} hasMore={hasMore} offset={offset}
          onPrev={() => setOffset(Math.max(0, offset - limit))} onNext={() => setOffset(offset + limit)} />
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Daily Logs</CardTitle>
          <Button size="sm" onClick={() => setLogDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Log</Button>
        </CardHeader>
        <CardContent><LogsSection logs={logs as DailyLog[]} logsLoading={logsLoading} /></CardContent>
      </Card>
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Daily Log</DialogTitle></DialogHeader>
          <DailyLogForm projectId={projectId} onSuccess={() => setLogDialogOpen(false)} onCancel={() => setLogDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
