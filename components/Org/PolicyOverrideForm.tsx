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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCreatePolicyOverride } from '@/hooks/useOrg';
import { policyOverrideCreateSchema } from '@/lib/validators/org';

type FormValues = z.infer<typeof policyOverrideCreateSchema>;

interface PolicyOverrideFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// eslint-disable-next-line max-lines-per-function
export function PolicyOverrideForm({ onSuccess, onCancel }: PolicyOverrideFormProps) {
  const createOverride = useCreatePolicyOverride();
  const form = useForm<FormValues>({
    resolver: zodResolver(policyOverrideCreateSchema),
    defaultValues: {
      user_id: '',
      permission_id: '',
      override_value: true,
      reason: '',
      expires_at: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createOverride.mutateAsync(values);
      toast.success('Policy override created');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to create policy override');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="user_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User ID</FormLabel>
              <FormControl>
                <Input placeholder="User UUID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="permission_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Permission ID</FormLabel>
              <FormControl>
                <Input placeholder="Permission UUID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="override_value"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel>Grant (on) / Deny (off)</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea placeholder="Reason for override" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expires At (optional)</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={createOverride.isPending}>
            {createOverride.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Override
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
