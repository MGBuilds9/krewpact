'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useAddSelectionOption } from '@/hooks/useSelections';
import { selectionOptionSchema } from '@/lib/validators/selections';
import { toast } from 'sonner';

type FormValues = z.infer<typeof selectionOptionSchema>;

// Numeric form type — z.string() for inputs, parseFloat on submit
interface FormState {
  option_group: string;
  option_name: string;
  allowance_amount: string;
  upgrade_amount: string;
  sort_order: string;
}

interface SelectionOptionFormProps {
  projectId: string;
  sheetId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SelectionOptionForm({ projectId, sheetId, onSuccess, onCancel }: SelectionOptionFormProps) {
  const addOption = useAddSelectionOption(projectId, sheetId);

  const form = useForm<FormState>({
    defaultValues: { option_group: '', option_name: '', allowance_amount: '', upgrade_amount: '', sort_order: '' },
  });

  async function onSubmit(values: FormState) {
    try {
      const payload: FormValues = {
        option_group: values.option_group,
        option_name: values.option_name,
        allowance_amount: values.allowance_amount ? parseFloat(values.allowance_amount) : undefined,
        upgrade_amount: values.upgrade_amount ? parseFloat(values.upgrade_amount) : undefined,
        sort_order: values.sort_order ? parseInt(values.sort_order, 10) : undefined,
      };
      await addOption.mutateAsync(payload);
      toast.success('Option added');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to add option');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Option Group</label>
        <Input placeholder="e.g. Countertops" {...form.register('option_group', { required: true })} />
      </div>
      <div>
        <label className="text-sm font-medium">Option Name</label>
        <Input placeholder="e.g. Quartz - White" {...form.register('option_name', { required: true })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Allowance Amount (CAD)</label>
          <Input type="number" step="0.01" placeholder="0.00" {...form.register('allowance_amount')} />
        </div>
        <div>
          <label className="text-sm font-medium">Upgrade Amount (CAD)</label>
          <Input type="number" step="0.01" placeholder="0.00" {...form.register('upgrade_amount')} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Sort Order</label>
        <Input type="number" placeholder="1" {...form.register('sort_order')} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={addOption.isPending}>
          {addOption.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Option
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
