'use client';

import { Clock, Plus, TrendingUp } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { TimeEntryForm } from '@/components/TimeExpense/TimeEntryForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCreateTimeEntry, useTimeEntries } from '@/hooks/useTimeExpense';

type TimeEntry = {
  id: string;
  work_date: string;
  cost_code?: string | null;
  notes?: string | null;
  hours_regular: number | string;
  hours_overtime?: number | string | null;
};

function EntryCard({ entry }: { entry: TimeEntry }) {
  const reg = Number(entry.hours_regular || 0);
  const ot = entry.hours_overtime ? Number(entry.hours_overtime) : 0;
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-3 px-4">
        <div>
          <p className="font-medium text-sm">{entry.work_date}</p>
          <p className="text-xs text-muted-foreground">
            {entry.cost_code ? `${entry.cost_code} · ` : ''}
            {entry.notes || ''}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Badge variant="secondary">{reg.toFixed(1)}h reg</Badge>
          {ot > 0 && <Badge variant="outline">{ot.toFixed(1)}h OT</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectTimePage() {
  const params = useParams();
  const projectId = params.id as string;
  const [open, setOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const { data: res, isLoading } = useTimeEntries(projectId);
  const createEntry = useCreateTimeEntry(projectId);

  const entries = res ? res.data || [] : [];
  const totalRegular = entries.reduce((s, e) => s + Number(e.hours_regular || 0), 0);
  const totalOT = entries.reduce((s, e) => s + Number(e.hours_overtime || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground text-sm">
            Log and review time entries for this project
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Log Time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Time Entry</DialogTitle>
            </DialogHeader>
            {currentUser && (
              <TimeEntryForm
                userId={currentUser.id}
                onSubmit={(values) => {
                  createEntry.mutate(values, { onSuccess: () => setOpen(false) });
                }}
                isLoading={createEntry.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" /> Regular Hours
            </div>
            <div className="text-2xl font-bold">{totalRegular.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" /> Overtime Hours
            </div>
            <div className="text-2xl font-bold text-orange-500">{totalOT.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Total Entries</div>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.length === 0 && (
            <p className="text-muted-foreground text-sm">No time entries yet.</p>
          )}
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry as TimeEntry} />
          ))}
        </div>
      )}
    </div>
  );
}
