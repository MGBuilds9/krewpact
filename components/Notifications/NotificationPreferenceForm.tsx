'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useOrg';
import { notificationPreferenceUpdateSchema } from '@/lib/validators/org';

type FormValues = z.infer<typeof notificationPreferenceUpdateSchema>;

const PREF_FIELDS: { name: keyof FormValues; label: string; description: string }[] = [
  {
    name: 'in_app_enabled',
    label: 'In-App Notifications',
    description: 'Receive notifications within KrewPact',
  },
  {
    name: 'email_enabled',
    label: 'Email Notifications',
    description: 'Receive notifications by email',
  },
  {
    name: 'push_enabled',
    label: 'Push Notifications',
    description: 'Receive push notifications on mobile',
  },
];

export function NotificationPreferenceForm() {
  const { data: prefs } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const form = useForm<FormValues>({
    resolver: zodResolver(notificationPreferenceUpdateSchema),
    defaultValues: { in_app_enabled: true, email_enabled: true, push_enabled: false },
  });

  useEffect(() => {
    if (prefs)
      form.reset({
        in_app_enabled: prefs.in_app_enabled,
        email_enabled: prefs.email_enabled,
        push_enabled: prefs.push_enabled,
      });
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
        {PREF_FIELDS.map(({ name, label, description }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <FormLabel>{label}</FormLabel>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </form>
    </Form>
  );
}
