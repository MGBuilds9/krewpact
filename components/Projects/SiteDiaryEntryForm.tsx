'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateSiteDiaryEntry, useUpdateSiteDiaryEntry } from '@/hooks/useProjectExtended';
import type { SiteDiaryEntry } from '@/hooks/useProjectExtended';
import { Loader2 } from 'lucide-react';

const entryTypes = [
  'observation',
  'visitor',
  'delivery',
  'weather',
  'safety',
  'progress',
  'other',
] as const;

const entryTypeLabels: Record<string, string> = {
  observation: 'Observation',
  visitor: 'Visitor',
  delivery: 'Delivery',
  weather: 'Weather',
  safety: 'Safety',
  progress: 'Progress',
  other: 'Other',
};

const formSchema = z.object({
  entry_at: z.string().min(1, 'Date is required'),
  entry_type: z.enum(entryTypes),
  entry_text: z.string().min(1, 'Entry text is required').max(2000),
});

type FormValues = z.infer<typeof formSchema>;

export interface SiteDiaryEntryFormProps {
  projectId: string;
  initialData?: SiteDiaryEntry;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SiteDiaryEntryForm({
  projectId,
  initialData,
  onSuccess,
  onCancel,
}: SiteDiaryEntryFormProps) {
  const createEntry = useCreateSiteDiaryEntry(projectId);
  const updateEntry = useUpdateSiteDiaryEntry(projectId);
  const isEditing = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entry_at: initialData?.entry_at
        ? initialData.entry_at.split('T')[0]
        : new Date().toISOString().split('T')[0],
      entry_type: (initialData?.entry_type as FormValues['entry_type']) ?? 'observation',
      entry_text: initialData?.entry_text ?? '',
    },
  });

  const isPending = createEntry.isPending || updateEntry.isPending;

  function onSubmit(values: FormValues) {
    if (isEditing) {
      updateEntry.mutate(
        { entryId: initialData.id, ...values },
        {
          onSuccess: () => {
            form.reset();
            onSuccess?.();
          },
        },
      );
    } else {
      createEntry.mutate(values, {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="entry_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="entry_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {entryTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {entryTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="entry_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what was observed, delivered, or noted..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Update Entry' : 'Add Entry'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
