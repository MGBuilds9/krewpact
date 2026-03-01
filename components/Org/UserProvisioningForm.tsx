'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useProvisionUser } from '@/hooks/useOrg';
import { userProvisioningSchema } from '@/lib/validators/org';
import { toast } from 'sonner';

type FormValues = z.infer<typeof userProvisioningSchema>;

interface UserProvisioningFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UserProvisioningForm({ onSuccess, onCancel }: UserProvisioningFormProps) {
  const provision = useProvisionUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(userProvisioningSchema),
    defaultValues: { email: '', full_name: '', role_ids: [], division_ids: [] },
  });

  async function onSubmit(values: FormValues) {
    try {
      await provision.mutateAsync(values);
      toast.success('User provisioned successfully');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to provision user');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@mdmgroupinc.ca" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-sm text-muted-foreground">
          Role and division assignments are managed after provisioning.
        </p>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={provision.isPending}>
            {provision.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Provision User
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          )}
        </div>
      </form>
    </Form>
  );
}
