'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useSubmitSelectionChoice } from '@/hooks/useSelections';
import { toast } from 'sonner';

interface FormState {
  selection_option_id: string;
  quantity: string;
  notes: string;
}

interface SelectionChoiceFormProps {
  projectId: string;
  sheetId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SelectionChoiceForm({ projectId, sheetId, onSuccess, onCancel }: SelectionChoiceFormProps) {
  const submit = useSubmitSelectionChoice(projectId, sheetId);
  const form = useForm<FormState>({ defaultValues: { selection_option_id: '', quantity: '', notes: '' } });

  async function onSubmit(values: FormState) {
    try {
      await submit.mutateAsync({
        selection_option_id: values.selection_option_id,
        quantity: values.quantity ? parseFloat(values.quantity) : undefined,
        notes: values.notes || undefined,
      });
      toast.success('Choice submitted');
      onSuccess?.();
    } catch {
      toast.error('Failed to submit choice');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Option ID</label>
        <Input placeholder="Selection option UUID" {...form.register('selection_option_id', { required: true })} />
      </div>
      <div>
        <label className="text-sm font-medium">Quantity</label>
        <Input type="number" step="0.01" placeholder="1" {...form.register('quantity')} />
      </div>
      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea placeholder="Any notes about this selection..." {...form.register('notes')} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Choice
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
