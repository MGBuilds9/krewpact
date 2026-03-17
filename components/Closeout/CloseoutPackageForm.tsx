'use client';

import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useCreateCloseoutPackage, useUpdateCloseoutPackage } from '@/hooks/useCloseout';

interface CloseoutPackageFormProps {
  projectId: string;
  pkgId?: string;
  defaultStatus?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CloseoutPackageForm({
  projectId,
  pkgId,
  defaultStatus,
  onSuccess,
  onCancel,
}: CloseoutPackageFormProps) {
  const create = useCreateCloseoutPackage(projectId);
  const update = useUpdateCloseoutPackage(projectId);
  const isEdit = !!pkgId;

  const form = useForm({
    defaultValues: { status: defaultStatus ?? 'draft' },
  });

  async function onSubmit(values: { status: string }) {
    try {
      if (isEdit) {
        await update.mutateAsync({
          pkgId: pkgId!,
          status: values.status as
            | 'draft'
            | 'in_review'
            | 'client_review'
            | 'accepted'
            | 'rejected',
        });
        toast.success('Closeout package updated');
      } else {
        await create.mutateAsync({});
        toast.success('Closeout package created');
      }
      onSuccess?.();
    } catch {
      toast.error('Failed to save closeout package');
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {isEdit && (
        <div>
          <label className="text-sm font-medium">Status</label>
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            {...form.register('status')}
          >
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="client_review">Client Review</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Update Package' : 'Create Package'}
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
