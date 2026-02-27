'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateCloseoutPackage, useUpdateCloseoutPackage } from '@/hooks/useCloseout';
import { closeoutPackageCreateSchema, closeoutPackageUpdateSchema } from '@/lib/validators/closeout';
import { toast } from 'sonner';

interface CloseoutPackageFormProps {
  projectId: string;
  pkgId?: string;
  defaultStatus?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CloseoutPackageForm({ projectId, pkgId, defaultStatus, onSuccess, onCancel }: CloseoutPackageFormProps) {
  const create = useCreateCloseoutPackage(projectId);
  const update = useUpdateCloseoutPackage(projectId);
  const isEdit = !!pkgId;

  const form = useForm({
    defaultValues: { status: defaultStatus ?? 'draft' },
  });

  async function onSubmit(values: { status: string }) {
    try {
      if (isEdit) {
        await update.mutateAsync({ pkgId: pkgId!, status: values.status as 'draft' | 'in_review' | 'client_review' | 'accepted' | 'rejected' });
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
          <select className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" {...form.register('status')}>
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
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
