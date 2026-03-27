'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const quickFollowUpSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  activity_type: z.enum(['task', 'call', 'meeting', 'email']),
  due_at: z.string().min(1, 'Due date is required'),
  details: z.string().optional(),
});

type FormValues = z.infer<typeof quickFollowUpSchema>;

interface QuickFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'lead' | 'opportunity' | 'account' | 'contact';
  entityId: string;
  entityName?: string;
  defaultTitle?: string;
}

const entityKeyMap = {
  lead: 'lead_id',
  opportunity: 'opportunity_id',
  account: 'account_id',
  contact: 'contact_id',
} as const;
const QUICK_PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
];

function getDefaultDueDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16);
}

function FollowUpFormFields({
  form,
  setPresetDue,
  isPending,
  onCancel,
}: {
  form: FormProp;
  setPresetDue: (days: number) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>What needs to happen? *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Call to discuss proposal" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="activity_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="due_at"
        render={({ field }) => (
          <FormItem>
            <FormLabel>When? *</FormLabel>
            <div className="flex gap-1 mb-2">
              {QUICK_PRESETS.map((preset) => (
                <Button
                  key={preset.days}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setPresetDue(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <FormControl>
              <Input type="datetime-local" {...field} />
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
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea placeholder="Any additional context..." rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Schedule
        </Button>
      </div>
    </>
  );
}

export function QuickFollowUpDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  defaultTitle,
}: QuickFollowUpDialogProps) {
  const createActivity = useCreateActivity();
  const form = useForm<FormValues>({
    resolver: zodResolver(quickFollowUpSchema),
    defaultValues: {
      title: defaultTitle ?? '',
      activity_type: 'task',
      due_at: getDefaultDueDate(),
      details: '',
    },
  });

  function setPresetDue(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(9, 0, 0, 0);
    form.setValue('due_at', date.toISOString().slice(0, 16));
  }

  function onSubmit(values: FormValues) {
    createActivity.mutate(
      {
        ...values,
        details: values.details || undefined,
        due_at: new Date(values.due_at).toISOString(),
        [entityKeyMap[entityType]]: entityId,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Follow-Up</DialogTitle>
          <DialogDescription>
            {entityName ? `For ${entityName}` : `Create a follow-up ${entityType}`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FollowUpFormFields
              form={form}
              setPresetDue={setPresetDue}
              isPending={createActivity.isPending}
              onCancel={() => onOpenChange(false)}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
