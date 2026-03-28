'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateActivity } from '@/hooks/useCRM';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormProp = any;

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

// eslint-disable-next-line max-lines-per-function
function ActivityFormFields({
  form,
  isPending,
  onCancel,
}: {
  form: FormProp;
  isPending: boolean;
  onCancel?: () => void;
}) {
  return (
    <>
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
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Log Activity
        </Button>
      </div>
    </>
  );
}

export function ActivityForm({ entityType, entityId, onSuccess, onCancel }: ActivityFormProps) {
  const createActivity = useCreateActivity();

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: { activity_type: 'call', title: '', details: '', due_at: '' },
  });

  function onSubmit(values: ActivityFormValues) {
    createActivity.mutate(
      {
        ...values,
        details: values.details || undefined,
        due_at: values.due_at || undefined,
        [entityKeyMap[entityType]]: entityId,
      },
      {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ActivityFormFields form={form} isPending={createActivity.isPending} onCancel={onCancel} />
      </form>
    </Form>
  );
}
