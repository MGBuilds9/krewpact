'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useCreateDeficiency, useUpdateDeficiency } from '@/hooks/useCloseout';
import { toast } from 'sonner';

interface FormState {
  title: string;
  details: string;
  severity: string;
  assigned_to: string;
  due_at: string;
}

interface DeficiencyItemFormProps {
  projectId: string;
  defId?: string;
  defaultValues?: Partial<FormState>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DeficiencyItemForm({
  projectId,
  defId,
  defaultValues,
  onSuccess,
  onCancel,
}: DeficiencyItemFormProps) {
  const create = useCreateDeficiency(projectId);
  const update = useUpdateDeficiency(projectId);
  const isEdit = !!defId;

  const form = useForm<FormState>({
    defaultValues: {
      title: defaultValues?.title ?? '',
      details: defaultValues?.details ?? '',
      severity: defaultValues?.severity ?? 'medium',
      assigned_to: defaultValues?.assigned_to ?? '',
      due_at: defaultValues?.due_at ?? '',
    },
  });

  async function onSubmit(values: FormState) {
    try {
      const payload = {
        title: values.title,
        details: values.details || undefined,
        severity: (values.severity as 'low' | 'medium' | 'high' | 'critical') || undefined,
        assigned_to: values.assigned_to || undefined,
        due_at: values.due_at || undefined,
      };

      if (isEdit) {
        await update.mutateAsync({ defId: defId!, ...payload });
        toast.success('Deficiency updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Deficiency created');
      }
      onSuccess?.();
    } catch {
      toast.error('Failed to save deficiency');
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Title</label>
        <Input
          placeholder="Describe the deficiency"
          {...form.register('title', { required: true })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Details</label>
        <Textarea placeholder="Additional details..." {...form.register('details')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Severity</label>
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            {...form.register('severity')}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Due Date</label>
          <Input type="date" {...form.register('due_at')} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Update Deficiency' : 'Create Deficiency'}
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
