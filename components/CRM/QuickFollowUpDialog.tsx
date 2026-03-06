'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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

function getDefaultDueDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16);
}

const QUICK_PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
];

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
    const entityKey = entityKeyMap[entityType];
    const payload = {
      ...values,
      details: values.details || undefined,
      due_at: new Date(values.due_at).toISOString(),
      [entityKey]: entityId,
    };

    createActivity.mutate(payload, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createActivity.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createActivity.isPending}>
                {createActivity.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Schedule
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
