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
import { useCreateRFI } from '@/hooks/useFieldOps';
import { rfiCreateSchema } from '@/lib/validators/field-ops';

type FormValues = z.infer<typeof rfiCreateSchema>;

interface RFICreateFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RFICreateForm({ projectId, onSuccess, onCancel }: RFICreateFormProps) {
  const createRFI = useCreateRFI(projectId);
  const form = useForm<FormValues>({
    resolver: zodResolver(rfiCreateSchema),
    defaultValues: {
      rfi_number: '',
      title: '',
      question_text: '',
      due_at: '',
      responder_user_id: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        due_at: values.due_at || undefined,
        responder_user_id: values.responder_user_id || undefined,
      };
      await createRFI.mutateAsync(payload as Parameters<typeof createRFI.mutateAsync>[0]);
      toast.success('RFI created');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to create RFI');
    }
  }

  const ff = form.control;
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={ff} name="rfi_number" render={({ field }) => (
            <FormItem><FormLabel>RFI Number</FormLabel><FormControl><Input placeholder="e.g. RFI-001" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={ff} name="due_at" render={({ field }) => (
            <FormItem><FormLabel>Due Date (optional)</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={ff} name="title" render={({ field }) => (
          <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Brief description of the question" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={ff} name="question_text" render={({ field }) => (
          <FormItem><FormLabel>Question</FormLabel><FormControl><Textarea placeholder="Provide detailed question or clarification request..." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" disabled={createRFI.isPending}>
            {createRFI.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit RFI
          </Button>
        </div>
      </form>
    </Form>
  );
}
