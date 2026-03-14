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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useCreateAssembly, useUpdateAssembly } from '@/hooks/useEstimating';
import type { Assembly } from '@/hooks/useEstimating';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  assembly_code: z.string().max(50).optional(),
  assembly_name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required').max(20),
  is_active: z.boolean(),
  division_id: z.string().uuid().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface AssemblyBuilderFormProps {
  assembly?: Assembly;
  divisionId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AssemblyBuilderForm({
  assembly,
  divisionId,
  onSuccess,
  onCancel,
}: AssemblyBuilderFormProps) {
  const createAssembly = useCreateAssembly();
  const updateAssembly = useUpdateAssembly();
  const isEditing = !!assembly;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assembly_code: assembly?.assembly_code ?? '',
      assembly_name: assembly?.assembly_name ?? '',
      description: assembly?.description ?? '',
      unit: assembly?.unit ?? '',
      is_active: assembly?.is_active ?? true,
      division_id: assembly?.division_id ?? divisionId,
    },
  });

  const isPending = createAssembly.isPending || updateAssembly.isPending;

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      assembly_code: values.assembly_code || undefined,
      description: values.description || undefined,
    };

    if (isEditing) {
      updateAssembly.mutate(
        { id: assembly.id, ...payload },
        {
          onSuccess: () => {
            form.reset();
            onSuccess?.();
          },
        },
      );
    } else {
      createAssembly.mutate(payload, {
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
            name="assembly_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assembly Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. ASM-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. EA, LF, SF" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="assembly_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assembly Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Interior Wall Assembly" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe this assembly..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Active</FormLabel>
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
            {isEditing ? 'Update Assembly' : 'Create Assembly'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
