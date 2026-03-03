'use client';

import { useForm, type Resolver } from 'react-hook-form';
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
import { useCreateSequenceStep } from '@/hooks/useCRM';
import { Loader2 } from 'lucide-react';
import type { SequenceStep } from '@/hooks/useCRM';

const actionTypes = ['email', 'task', 'wait'] as const;

const stepFormSchema = z.object({
  action_type: z.enum(actionTypes),
  delay_days: z.number().int().min(0),
  delay_hours: z.number().int().min(0).max(23),
  // Email config
  email_subject: z.string().optional(),
  email_body: z.string().optional(),
  // Task config
  task_title: z.string().optional(),
  task_description: z.string().optional(),
});

type StepFormValues = z.infer<typeof stepFormSchema>;

const actionTypeLabels: Record<string, string> = {
  email: 'Send Email',
  task: 'Create Task',
  wait: 'Wait',
};

export interface SequenceStepFormProps {
  sequenceId: string;
  initialData?: Partial<SequenceStep>;
  nextStepNumber: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function extractFormDefaults(initialData?: Partial<SequenceStep>): StepFormValues {
  const config = (initialData?.action_config ?? {}) as Record<string, unknown>;
  return {
    action_type: (initialData?.action_type as 'email' | 'task' | 'wait') ?? 'email',
    delay_days: initialData?.delay_days ?? 0,
    delay_hours: initialData?.delay_hours ?? 0,
    email_subject: (config.subject as string) ?? '',
    email_body: (config.body as string) ?? '',
    task_title: (config.title as string) ?? '',
    task_description: (config.description as string) ?? '',
  };
}

export function SequenceStepForm({
  sequenceId,
  initialData,
  nextStepNumber,
  onSuccess,
  onCancel,
}: SequenceStepFormProps) {
  const createStep = useCreateSequenceStep();

  const form = useForm<StepFormValues>({
    resolver: zodResolver(stepFormSchema) as Resolver<StepFormValues>,
    defaultValues: extractFormDefaults(initialData),
  });

  const actionType = form.watch('action_type');

  function buildActionConfig(values: StepFormValues): Record<string, unknown> {
    if (values.action_type === 'email') {
      return {
        subject: values.email_subject || undefined,
        body: values.email_body || undefined,
      };
    }
    if (values.action_type === 'task') {
      return {
        title: values.task_title || undefined,
        description: values.task_description || undefined,
      };
    }
    return {};
  }

  function onSubmit(values: StepFormValues) {
    const stepNumber = initialData?.step_number ?? nextStepNumber;
    const actionConfig = buildActionConfig(values);

    createStep.mutate(
      {
        sequenceId,
        step_number: stepNumber,
        action_type: values.action_type,
        action_config: actionConfig,
        delay_days: values.delay_days,
        delay_hours: values.delay_hours,
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
        <FormField
          control={form.control}
          name="action_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Action Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {actionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {actionTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email config fields */}
        {actionType === 'email' && (
          <>
            <FormField
              control={form.control}
              name="email_subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Email subject line" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email_body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Email body content" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Task config fields */}
        {actionType === 'task' && (
          <>
            <FormField
              control={form.control}
              name="task_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="task_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Task description" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="delay_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delay (days)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="delay_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delay (hours)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="23" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Step {initialData?.step_number ?? nextStepNumber}
        </p>

        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createStep.isPending}>
            {createStep.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initialData ? 'Update Step' : 'Add Step'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
