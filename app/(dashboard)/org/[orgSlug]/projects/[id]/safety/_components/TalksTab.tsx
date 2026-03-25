'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { ToolboxTalkForm } from '@/components/Safety/ToolboxTalkForm';
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
import { TabsContent } from '@/components/ui/tabs';

import { LoadingSkeleton } from './LoadingSkeleton';

type Talk = { id: string; topic: string; talk_date: string; attendee_count: number };

export function TalksTab({
  talks,
  loading,
  onCreate,
}: {
  talks: Talk[];
  loading: boolean;
  onCreate: (v: unknown) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <TabsContent value="talks" className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Log Talk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Toolbox Talk</DialogTitle>
            </DialogHeader>
            <ToolboxTalkForm
              onSubmit={(v) => {
                onCreate(v);
                setDialogOpen(false);
              }}
              isLoading={false}
            />
          </DialogContent>
        </Dialog>
      </div>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-2">
          {talks.length === 0 && (
            <p className="text-muted-foreground text-sm">No toolbox talks recorded.</p>
          )}
          {talks.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-medium text-sm">{t.topic}</p>
                  <p className="text-xs text-muted-foreground">{t.talk_date}</p>
                </div>
                <Badge variant="secondary">{t.attendee_count} attendees</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  );
}
