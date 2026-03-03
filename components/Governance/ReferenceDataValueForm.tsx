'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useAddReferenceDataValue } from '@/hooks/useGovernance';
import { toast } from 'sonner';

interface FormState {
  value_key: string;
  value_name: string;
  sort_order: string;
}

interface ReferenceDataValueFormProps {
  setId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReferenceDataValueForm({
  setId,
  onSuccess,
  onCancel,
}: ReferenceDataValueFormProps) {
  const add = useAddReferenceDataValue(setId);
  const form = useForm<FormState>({
    defaultValues: { value_key: '', value_name: '', sort_order: '' },
  });

  async function onSubmit(values: FormState) {
    try {
      await add.mutateAsync({
        value_key: values.value_key,
        value_name: values.value_name,
        sort_order: values.sort_order ? parseInt(values.sort_order, 10) : undefined,
      });
      toast.success('Value added');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to add value');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-3">
      <div>
        <label className="text-xs font-medium">Key</label>
        <Input placeholder="value_key" {...form.register('value_key', { required: true })} />
      </div>
      <div>
        <label className="text-xs font-medium">Name</label>
        <Input placeholder="Display Name" {...form.register('value_name', { required: true })} />
      </div>
      <div>
        <label className="text-xs font-medium">Sort</label>
        <Input type="number" placeholder="0" {...form.register('sort_order')} className="w-20" />
      </div>
      <Button type="submit" disabled={add.isPending}>
        {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Add
      </Button>
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </form>
  );
}
