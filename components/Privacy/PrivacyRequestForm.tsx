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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreatePrivacyRequest } from '@/hooks/useGovernance';
import { privacyRequestCreateSchema } from '@/lib/validators/migration';
import { toast } from 'sonner';

type FormValues = z.infer<typeof privacyRequestCreateSchema>;

interface PrivacyRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PrivacyRequestForm({ onSuccess, onCancel }: PrivacyRequestFormProps) {
  const create = useCreatePrivacyRequest();

  const form = useForm<FormValues>({
    resolver: zodResolver(privacyRequestCreateSchema),
    defaultValues: {
      requester_email: '',
      requester_name: '',
      request_type: 'access',
      legal_basis: '',
      notes: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync(values);
      toast.success('Privacy request logged');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to log privacy request');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="requester_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requester Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="requester@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="requester_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requester Name</FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="request_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Request Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="access">Access</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                  <SelectItem value="deletion">Deletion</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Request
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
