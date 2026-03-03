'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useOrg';
import { notificationPreferenceUpdateSchema } from '@/lib/validators/org';
import { toast } from 'sonner';
import { useEffect } from 'react';

type FormValues = z.infer<typeof notificationPreferenceUpdateSchema>;

export function NotificationPreferenceForm() {
  const { data: prefs } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const form = useForm<FormValues>({
    resolver: zodResolver(notificationPreferenceUpdateSchema),
    defaultValues: { in_app_enabled: true, email_enabled: true, push_enabled: false },
  });

  useEffect(() => {
    if (prefs) {
      form.reset({
        in_app_enabled: prefs.in_app_enabled,
        email_enabled: prefs.email_enabled,
        push_enabled: prefs.push_enabled,
      });
    }
  }, [prefs, form]);

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync(values);
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="in_app_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <FormLabel>In-App Notifications</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Receive notifications within KrewPact
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <FormLabel>Email Notifications</FormLabel>
                <p className="text-sm text-muted-foreground">Receive notifications by email</p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="push_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <FormLabel>Push Notifications</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on mobile
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={update.isPending}>
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </form>
    </Form>
  );
}
