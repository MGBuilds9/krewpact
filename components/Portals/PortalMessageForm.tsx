'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useSendPortalMessage } from '@/hooks/usePortals';
import { portalMessageSchema } from '@/lib/validators/portals';
import { toast } from 'sonner';

type FormValues = z.infer<typeof portalMessageSchema>;

interface PortalMessageFormProps {
  portalAccountId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PortalMessageForm({
  portalAccountId,
  onSuccess,
  onCancel,
}: PortalMessageFormProps) {
  const sendMessage = useSendPortalMessage();

  const form = useForm<FormValues>({
    resolver: zodResolver(portalMessageSchema),
    defaultValues: {
      portal_account_id: portalAccountId,
      subject: '',
      body: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await sendMessage.mutateAsync(values);
      toast.success('Message sent');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to send message');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Message subject" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea placeholder="Write your message..." rows={5} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={sendMessage.isPending}>
            {sendMessage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Message
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
