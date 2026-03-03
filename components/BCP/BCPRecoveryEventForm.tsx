'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FormState {
  event_type: string;
}

interface BCPRecoveryEventFormProps {
  incidentId: string;
  onSuccess?: () => void;
}

export function BCPRecoveryEventForm({ incidentId, onSuccess }: BCPRecoveryEventFormProps) {
  const queryClient = useQueryClient();

  const addEvent = useMutation({
    mutationFn: (data: { event_type: string }) =>
      apiFetch(`/api/bcp/incidents/${incidentId}/recovery`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bcp-incidents'] });
      toast.success('Recovery event logged');
      onSuccess?.();
    },
    onError: () => toast.error('Failed to log recovery event'),
  });

  const form = useForm<FormState>({ defaultValues: { event_type: '' } });

  return (
    <form onSubmit={form.handleSubmit((v) => addEvent.mutate(v))} className="flex gap-3">
      <Input
        placeholder="Event type (e.g. service_restored, failover_initiated)"
        {...form.register('event_type', { required: true })}
        className="flex-1"
      />
      <Button type="submit" size="sm" disabled={addEvent.isPending}>
        {addEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Log
      </Button>
    </form>
  );
}
