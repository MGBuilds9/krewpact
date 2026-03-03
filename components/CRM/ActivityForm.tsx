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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateActivity } from '@/hooks/useCRM';
import { Loader2 } from 'lucide-react';

const activityTypes = ['call', 'email', 'meeting', 'note', 'task'] as const;

const activityFormSchema = z.object({
  activity_type: z.enum(activityTypes),
  title: z.string().min(1, 'Title is required').max(200),
  details: z.string().optional(),
  due_at: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

export interface ActivityFormProps {
  entityType: 'lead' | 'opportunity' | 'account' | 'contact';
  entityId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const entityKeyMap = {
  lead: 'lead_id',
  opportunity: 'opportunity_id',
  account: 'account_id',
  contact: 'contact_id',
} as const;

const activityTypeLabels: Record<string, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  task: 'Task',
};

export function ActivityForm({ entityType, entityId, onSuccess, onCancel }: ActivityFormProps) {
  const createActivity = useCreateActivity();

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      activity_type: 'call',
      title: '',
      details: '',
      due_at: '',
    },
  });

  function onSubmit(values: ActivityFormValues) {
    const entityKey = entityKeyMap[entityType];
    const payload = {
      ...values,
      details: values.details || undefined,
      due_at: values.due_at || undefined,
      [entityKey]: entityId,
    };

    createActivity.mutate(payload, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="activity_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {activityTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Follow-up call" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details</FormLabel>
              <FormControl>
                <Textarea placeholder="Add notes or details..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="due_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={createActivity.isPending}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createActivity.isPending}>
            {createActivity.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Log Activity
          </Button>
        </div>
      </form>
    </Form>
  );
}
