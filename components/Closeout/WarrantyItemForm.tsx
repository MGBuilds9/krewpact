'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useCreateWarrantyItem } from '@/hooks/useCloseout';
import { toast } from 'sonner';

interface FormState {
  title: string;
  provider_name: string;
  warranty_start: string;
  warranty_end: string;
  terms: string;
}

interface WarrantyItemFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function WarrantyItemForm({ projectId, onSuccess, onCancel }: WarrantyItemFormProps) {
  const create = useCreateWarrantyItem(projectId);
  const form = useForm<FormState>({
    defaultValues: {
      title: '',
      provider_name: '',
      warranty_start: '',
      warranty_end: '',
      terms: '',
    },
  });

  async function onSubmit(values: FormState) {
    try {
      await create.mutateAsync({
        title: values.title,
        provider_name: values.provider_name || undefined,
        warranty_start: values.warranty_start,
        warranty_end: values.warranty_end,
        terms: values.terms || undefined,
      });
      toast.success('Warranty item created');
      onSuccess?.();
    } catch {
      toast.error('Failed to create warranty item');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Title</label>
        <Input placeholder="e.g. HVAC Warranty" {...form.register('title', { required: true })} />
      </div>
      <div>
        <label className="text-sm font-medium">Provider</label>
        <Input placeholder="Provider company name" {...form.register('provider_name')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Start Date</label>
          <Input type="date" {...form.register('warranty_start', { required: true })} />
        </div>
        <div>
          <label className="text-sm font-medium">End Date</label>
          <Input type="date" {...form.register('warranty_end', { required: true })} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Terms</label>
        <Textarea placeholder="Warranty terms and conditions..." {...form.register('terms')} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Warranty
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
