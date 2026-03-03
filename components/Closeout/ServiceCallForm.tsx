'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useCreateServiceCall } from '@/hooks/useCloseout';
import { toast } from 'sonner';

interface FormState {
  call_number: string;
  title: string;
  description: string;
  priority: string;
}

interface ServiceCallFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ServiceCallForm({ projectId, onSuccess, onCancel }: ServiceCallFormProps) {
  const create = useCreateServiceCall(projectId);
  const form = useForm<FormState>({
    defaultValues: { call_number: '', title: '', description: '', priority: 'medium' },
  });

  async function onSubmit(values: FormState) {
    try {
      await create.mutateAsync({
        call_number: values.call_number,
        title: values.title,
        description: values.description || undefined,
        priority: (values.priority as 'low' | 'medium' | 'high' | 'urgent') || undefined,
      });
      toast.success('Service call created');
      onSuccess?.();
    } catch {
      toast.error('Failed to create service call');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Call Number</label>
          <Input placeholder="SC-001" {...form.register('call_number', { required: true })} />
        </div>
        <div>
          <label className="text-sm font-medium">Priority</label>
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            {...form.register('priority')}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Title</label>
        <Input placeholder="Service call title" {...form.register('title', { required: true })} />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea placeholder="Describe the issue..." {...form.register('description')} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Service Call
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
