'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { useCreateSelectionSheet, useUpdateSelectionSheet } from '@/hooks/useSelections';
import {
  selectionSheetCreateSchema,
  selectionSheetUpdateSchema,
} from '@/lib/validators/selections';

type CreateValues = z.infer<typeof selectionSheetCreateSchema>;
type UpdateValues = z.infer<typeof selectionSheetUpdateSchema>;

interface SelectionSheetFormProps {
  projectId: string;
  sheetId?: string;
  defaultValues?: Partial<UpdateValues>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SelectionSheetForm({
  projectId,
  sheetId,
  defaultValues,
  onSuccess,
  onCancel,
}: SelectionSheetFormProps) {
  const create = useCreateSelectionSheet(projectId);
  const update = useUpdateSelectionSheet(projectId);
  const isEdit = !!sheetId;

  const form = useForm<CreateValues>({
    resolver: zodResolver(selectionSheetCreateSchema),
    defaultValues: { sheet_name: defaultValues?.sheet_name ?? '' },
  });

  async function onSubmit(values: CreateValues) {
    try {
      if (isEdit) {
        await update.mutateAsync({ sheetId: sheetId!, ...values });
        toast.success('Selection sheet updated');
      } else {
        await create.mutateAsync(values);
        toast.success('Selection sheet created');
      }
      onSuccess?.();
    } catch {
      toast.error('Failed to save selection sheet');
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="sheet_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sheet Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Kitchen Finishes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Update Sheet' : 'Create Sheet'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
