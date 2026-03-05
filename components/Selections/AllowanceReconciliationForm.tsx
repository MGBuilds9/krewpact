'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useCreateAllowance } from '@/hooks/useSelections';
import { toast } from 'sonner';

interface FormState {
  category_name: string;
  allowance_budget: string;
  selected_cost: string;
}

interface AllowanceReconciliationFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AllowanceReconciliationForm({
  projectId,
  onSuccess,
  onCancel,
}: AllowanceReconciliationFormProps) {
  const create = useCreateAllowance(projectId);
  const form = useForm<FormState>({
    defaultValues: { category_name: '', allowance_budget: '', selected_cost: '' },
  });

  async function onSubmit(values: FormState) {
    try {
      const budget = parseFloat(values.allowance_budget);
      const cost = parseFloat(values.selected_cost);
      await create.mutateAsync({
        category_name: values.category_name,
        allowance_budget: budget,
        selected_cost: cost,
        variance: cost - budget,
      });
      toast.success('Allowance reconciliation saved');
      onSuccess?.();
    } catch {
      toast.error('Failed to save allowance reconciliation');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Category</label>
        <Input
          placeholder="e.g. Flooring"
          {...form.register('category_name', { required: true })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Allowance Budget (CAD)</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...form.register('allowance_budget', { required: true })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Selected Cost (CAD)</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...form.register('selected_cost', { required: true })}
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Reconciliation
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
