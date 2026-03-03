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

const formSchema = z
  .object({
    invited_email: z.string().email('Must be a valid email').optional().or(z.literal('')),
    portal_account_id: z.string().uuid('Must be a valid UUID').optional().or(z.literal('')),
  })
  .refine((data) => data.invited_email || data.portal_account_id, {
    message: 'Either email or portal account ID is required',
    path: ['invited_email'],
  });

type FormValues = z.infer<typeof formSchema>;

interface RFQInviteFormProps {
  onSubmit: (data: Partial<FormValues>) => void;
  isLoading?: boolean;
}

export function RFQInviteForm({ onSubmit, isLoading }: RFQInviteFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invited_email: '',
      portal_account_id: '',
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit({
      invited_email: values.invited_email || undefined,
      portal_account_id: values.portal_account_id || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="invited_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invite by Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contractor@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="portal_account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portal Account ID (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Existing portal account UUID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
