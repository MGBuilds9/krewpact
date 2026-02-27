'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useAddServiceCallEvent } from '@/hooks/useCloseout';
import { toast } from 'sonner';

interface FormState {
  event_type: string;
}

interface ServiceEventFormProps {
  projectId: string;
  callId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ServiceEventForm({ projectId, callId, onSuccess, onCancel }: ServiceEventFormProps) {
  const addEvent = useAddServiceCallEvent(projectId, callId);
  const form = useForm<FormState>({ defaultValues: { event_type: '' } });

  async function onSubmit(values: FormState) {
    try {
      await addEvent.mutateAsync({ event_type: values.event_type });
      toast.success('Event logged');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to log event');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-3">
      <Input
        placeholder="Event type (e.g. scheduled, technician_assigned)"
        {...form.register('event_type', { required: true })}
        className="flex-1"
      />
      <Button type="submit" disabled={addEvent.isPending}>
        {addEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Log
      </Button>
      {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
    </form>
  );
}
