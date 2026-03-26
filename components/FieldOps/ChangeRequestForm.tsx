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
import { Textarea } from '@/components/ui/textarea';
import { useCreateChangeRequest } from '@/hooks/useFieldOps';

const formSchema = z.object({
  request_number: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  estimated_cost_impact: z.string().optional(),
  estimated_days_impact: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ChangeRequestFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ChangeRequestForm({ projectId, onSuccess, onCancel }: ChangeRequestFormProps) {
  const createCR = useCreateChangeRequest(projectId);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      request_number: '',
      title: '',
      description: '',
      estimated_cost_impact: '',
      estimated_days_impact: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        request_number: values.request_number,
        title: values.title,
        description: values.description,
        estimated_cost_impact: values.estimated_cost_impact
          ? parseFloat(values.estimated_cost_impact)
          : undefined,
        estimated_days_impact: values.estimated_days_impact
          ? parseInt(values.estimated_days_impact, 10)
          : undefined,
      };
      await createCR.mutateAsync(payload as Parameters<typeof createCR.mutateAsync>[0]);
      toast.success('Change request created');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to create change request');
    }
  }

  const ff = form.control;
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={ff} name="request_number" render={({ field }) => (
          <FormItem><FormLabel>Request Number</FormLabel><FormControl><Input placeholder="e.g. CR-001" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={ff} name="title" render={({ field }) => (
          <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Brief description of the change" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={ff} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the change request in detail..." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={ff} name="estimated_cost_impact" render={({ field }) => (
            <FormItem><FormLabel>Est. Cost Impact (CAD)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={ff} name="estimated_days_impact" render={({ field }) => (
            <FormItem><FormLabel>Est. Days Impact</FormLabel><FormControl><Input type="number" step="1" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="flex gap-2 justify-end">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" disabled={createCR.isPending}>
            {createCR.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Change Request
          </Button>
        </div>
      </form>
    </Form>
  );
}
