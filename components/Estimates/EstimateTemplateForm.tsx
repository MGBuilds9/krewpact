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
import { useCreateEstimateTemplate, useUpdateEstimateTemplate } from '@/hooks/useEstimating';
import type { EstimateTemplate } from '@/hooks/useEstimating';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  template_name: z.string().min(1, 'Name is required').max(200),
  project_type: z.string().optional(),
  payload_json: z.string().min(2, 'Template payload is required'),
  is_default: z.boolean(),
  division_id: z.string().uuid().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface EstimateTemplateFormProps {
  template?: EstimateTemplate;
  divisionId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EstimateTemplateForm({
  template,
  divisionId,
  onSuccess,
  onCancel,
}: EstimateTemplateFormProps) {
  const createTemplate = useCreateEstimateTemplate();
  const updateTemplate = useUpdateEstimateTemplate();
  const isEditing = !!template;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      template_name: template?.template_name ?? '',
      project_type: template?.project_type ?? '',
      payload_json: template?.payload ? JSON.stringify(template.payload, null, 2) : '{}',
      is_default: template?.is_default ?? false,
      division_id: template?.division_id ?? divisionId,
    },
  });

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  function onSubmit(values: FormValues) {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(values.payload_json);
    } catch {
      form.setError('payload_json', { message: 'Invalid JSON' });
      return;
    }

    const data = {
      template_name: values.template_name,
      project_type: values.project_type || undefined,
      payload,
      is_default: values.is_default,
      division_id: values.division_id,
    };

    if (isEditing) {
      updateTemplate.mutate(
        { id: template.id, ...data },
        {
          onSuccess: () => {
            form.reset();
            onSuccess?.();
          },
        },
      );
    } else {
      createTemplate.mutate(data, {
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
        <FormField
          control={form.control}
          name="template_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Residential Renovation" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="project_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Type</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Renovation, New Build" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="payload_json"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Payload (JSON) *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"sections": [], "defaults": {}}'
                  rows={8}
                  className="font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Default Template</FormLabel>
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
            {isEditing ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
