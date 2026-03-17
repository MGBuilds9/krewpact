'use client';

import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSequenceDefaults, useUpdateSequenceDefaults } from '@/hooks/useCRM';

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

function NumberField({
  id,
  label,
  hint,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function TimeField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="time" value={value} onChange={(e) => onChange(e.target.value)} />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

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

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <NumberField
          id="max-enrollments"
          label="Max Enrollments Per Day"
          hint="Maximum number of contacts that can be enrolled into sequences per day."
          min={1}
          max={500}
          value={maxEnrollments}
          onChange={(v) => setForm((p) => ({ ...p, maxEnrollments: parseInt(v, 10) || 1 }))}
        />
        <NumberField
          id="throttle"
          label="Throttle Per Hour"
          hint="Maximum emails sent per hour across all sequences."
          min={1}
          max={200}
          value={throttlePerHour}
          onChange={(v) => setForm((p) => ({ ...p, throttlePerHour: parseInt(v, 10) || 1 }))}
        />
        <TimeField
          id="send-start"
          label="Send Window Start"
          hint="Earliest time emails can be sent (recipient local time)."
          value={sendWindowStart}
          onChange={(v) => setForm((p) => ({ ...p, sendWindowStart: v }))}
        />
        <TimeField
          id="send-end"
          label="Send Window End"
          hint="Latest time emails can be sent (recipient local time)."
          value={sendWindowEnd}
          onChange={(v) => setForm((p) => ({ ...p, sendWindowEnd: v }))}
        />
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
