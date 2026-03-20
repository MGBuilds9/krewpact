'use client';

import { Calendar, PhoneOff, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { DispositionResult } from '@/lib/crm/outcome-router';

export type DispositionOutcome = 'interested' | 'follow_up' | 'not_interested' | 'no_answer';

interface TaskDispositionButtonsProps {
  activityId: string;
  onDisposition?: (outcome: DispositionOutcome, result: DispositionResult) => void;
}

const OUTCOMES: {
  value: DispositionOutcome;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'outline' | 'destructive' | 'secondary';
  className?: string;
}[] = [
  {
    value: 'interested',
    label: 'Interested',
    icon: ThumbsUp,
    variant: 'default',
    className: 'bg-green-600 hover:bg-green-700 text-white',
  },
  {
    value: 'follow_up',
    label: 'Follow Up',
    icon: Calendar,
    variant: 'outline',
    className: 'border-blue-300 text-blue-700 hover:bg-blue-50',
  },
  {
    value: 'not_interested',
    label: 'Not Interested',
    icon: ThumbsDown,
    variant: 'destructive',
    className: '',
  },
  {
    value: 'no_answer',
    label: 'No Answer',
    icon: PhoneOff,
    variant: 'secondary',
    className: '',
  },
];

export default function TaskDispositionButtons({
  activityId,
  onDisposition,
}: TaskDispositionButtonsProps) {
  const [loading, setLoading] = useState<DispositionOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDisposition(outcome: DispositionOutcome) {
    setLoading(outcome);
    setError(null);

    try {
      const res = await fetch(`/api/crm/activities/${activityId}/disposition`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const result: DispositionResult = await res.json();
      onDisposition?.(outcome, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log outcome';
      setError(message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {OUTCOMES.map(({ value, label, icon: Icon, variant, className }) => (
        <Button
          key={value}
          size="sm"
          variant={variant}
          className={`h-7 text-xs gap-1 ${className}`}
          disabled={loading !== null}
          onClick={(e) => {
            e.stopPropagation();
            handleDisposition(value);
          }}
        >
          {loading === value ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
          {label}
        </Button>
      ))}
      {error && <p className="text-xs text-destructive w-full mt-1">{error}</p>}
    </div>
  );
}
