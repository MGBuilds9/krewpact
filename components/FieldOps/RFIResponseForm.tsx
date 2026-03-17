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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRFIThread } from '@/hooks/useFieldOps';
import { rfiThreadCreateSchema } from '@/lib/validators/field-ops';

type FormValues = z.infer<typeof rfiThreadCreateSchema>;

interface RFIResponseFormProps {
  projectId: string;
  rfiId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RFIResponseForm({ projectId, rfiId, onSuccess, onCancel }: RFIResponseFormProps) {
  const createThread = useCreateRFIThread(projectId, rfiId);

  const form = useForm<FormValues>({
    resolver: zodResolver(rfiThreadCreateSchema),
    defaultValues: {
      message_text: '',
      is_official_response: false,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createThread.mutateAsync(values as Parameters<typeof createThread.mutateAsync>[0]);
      toast.success('Response posted');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to post response');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="message_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter your response..." rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_official_response"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <Label>Official Response (closes RFI to &quot;responded&quot;)</Label>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createThread.isPending}>
            {createThread.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Post Response
          </Button>
        </div>
      </form>
    </Form>
  );
}
