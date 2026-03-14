'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Clock, TrendingUp } from 'lucide-react';
import { useTimeEntries, useCreateTimeEntry } from '@/hooks/useTimeExpense';
import { TimeEntryForm } from '@/components/TimeExpense/TimeEntryForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function ProjectTimePage() {
  const params = useParams();
  const projectId = params.id as string;
  const [open, setOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();

  const { data: res, isLoading } = useTimeEntries(projectId);
  const createEntry = useCreateTimeEntry(projectId);

  const entries = res?.data ?? [];
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
            <Card key={entry.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-medium text-sm">{entry.work_date}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.cost_code ? `${entry.cost_code} · ` : ''}
                    {entry.notes ?? ''}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <Badge variant="secondary">{Number(entry.hours_regular).toFixed(1)}h reg</Badge>
                  {entry.hours_overtime ? (
                    <Badge variant="outline">{Number(entry.hours_overtime).toFixed(1)}h OT</Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
