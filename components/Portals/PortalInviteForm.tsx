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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useInvitePortalAccount } from '@/hooks/usePortals';
import { portalAccountInviteSchema } from '@/lib/validators/portals';
import { toast } from 'sonner';

type FormValues = z.infer<typeof portalAccountInviteSchema>;

interface PortalInviteFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PortalInviteForm({ onSuccess, onCancel }: PortalInviteFormProps) {
  const invite = useInvitePortalAccount();

  const form = useForm<FormValues>({
    resolver: zodResolver(portalAccountInviteSchema),
    defaultValues: {
      actor_type: 'client',
      role: 'client_owner',
      email: '',
      company_name: '',
      contact_name: '',
      phone: '',
    },
  });

  const actorType = form.watch('actor_type');

  async function onSubmit(values: FormValues) {
    try {
      await invite.mutateAsync(values);
      toast.success('Portal invitation sent');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to send invitation');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="actor_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="trade_partner">Trade Partner</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || (actorType === 'client' ? 'client_owner' : 'trade_partner_admin')}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {actorType === 'client' ? (
                    <>
                      <SelectItem value="client_owner">Client Owner</SelectItem>
                      <SelectItem value="client_delegate">Client Delegate</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="trade_partner_admin">Trade Partner Admin</SelectItem>
                      <SelectItem value="trade_partner_user">Trade Partner User</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Name</FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+1 (416) 555-0100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={invite.isPending}>
            {invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invitation
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
