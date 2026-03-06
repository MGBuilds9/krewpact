'use client';

import { useState } from 'react';
import { useSequenceDefaults, useUpdateSequenceDefaults } from '@/hooks/useCRM';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';

interface SeqFormState {
  maxEnrollments: number;
  sendWindowStart: string;
  sendWindowEnd: string;
  throttlePerHour: number;
  autoUnenroll: boolean;
  _syncKey: string;
}

const INITIAL_STATE: SeqFormState = {
  maxEnrollments: 50,
  sendWindowStart: '09:00',
  sendWindowEnd: '17:00',
  throttlePerHour: 20,
  autoUnenroll: true,
  _syncKey: '',
};

export default function SequenceDefaultsForm() {
  const { data: defaults, isLoading } = useSequenceDefaults();
  const updateDefaults = useUpdateSequenceDefaults();

  const [form, setForm] = useState<SeqFormState>(INITIAL_STATE);

  const dataKey = JSON.stringify(defaults);
  if (defaults && form._syncKey !== dataKey) {
    setForm({
      maxEnrollments: defaults.max_enrollments_per_day,
      sendWindowStart: defaults.send_window_start,
      sendWindowEnd: defaults.send_window_end,
      throttlePerHour: defaults.throttle_per_hour,
      autoUnenroll: defaults.auto_unenroll_on_reply,
      _syncKey: dataKey,
    });
  }

  const { maxEnrollments, sendWindowStart, sendWindowEnd, throttlePerHour, autoUnenroll } = form;

  function handleSave() {
    updateDefaults.mutate({
      max_enrollments_per_day: maxEnrollments,
      send_window_start: sendWindowStart,
      send_window_end: sendWindowEnd,
      throttle_per_hour: throttlePerHour,
      auto_unenroll_on_reply: autoUnenroll,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="max-enrollments">Max Enrollments Per Day</Label>
          <Input
            id="max-enrollments"
            type="number"
            min={1}
            max={500}
            value={maxEnrollments}
            onChange={(e) => setForm((p) => ({ ...p, maxEnrollments: parseInt(e.target.value, 10) || 1 }))}
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of contacts that can be enrolled into sequences per day.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="throttle">Throttle Per Hour</Label>
          <Input
            id="throttle"
            type="number"
            min={1}
            max={200}
            value={throttlePerHour}
            onChange={(e) => setForm((p) => ({ ...p, throttlePerHour: parseInt(e.target.value, 10) || 1 }))}
          />
          <p className="text-xs text-muted-foreground">
            Maximum emails sent per hour across all sequences.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="send-start">Send Window Start</Label>
          <Input
            id="send-start"
            type="time"
            value={sendWindowStart}
            onChange={(e) => setForm((p) => ({ ...p, sendWindowStart: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Earliest time emails can be sent (recipient local time).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="send-end">Send Window End</Label>
          <Input
            id="send-end"
            type="time"
            value={sendWindowEnd}
            onChange={(e) => setForm((p) => ({ ...p, sendWindowEnd: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Latest time emails can be sent (recipient local time).
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="auto-unenroll">Auto-Unenroll on Reply</Label>
          <p className="text-xs text-muted-foreground">
            Automatically remove contacts from sequences when they reply to an email.
          </p>
        </div>
        <Switch
          id="auto-unenroll"
          checked={autoUnenroll}
          onCheckedChange={(v) => setForm((p) => ({ ...p, autoUnenroll: v }))}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateDefaults.isPending}>
          {updateDefaults.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Sequence Defaults
        </Button>
      </div>

      {updateDefaults.isSuccess && (
        <p className="text-sm text-green-600">Sequence defaults saved successfully.</p>
      )}
      {updateDefaults.isError && (
        <p className="text-sm text-destructive">
          Failed to save sequence defaults. Please try again.
        </p>
      )}
    </div>
  );
}
