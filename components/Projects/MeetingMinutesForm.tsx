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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateMeeting } from '@/hooks/useProjectExtended';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  meeting_date: z.string().min(1, 'Date is required'),
  title: z.string().min(1, 'Title is required').max(200),
  attendees_raw: z.string().min(1, 'At least one attendee is required'),
  agenda: z.string().optional(),
  notes: z.string().min(1, 'Notes are required'),
  action_items_raw: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface MeetingMinutesFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MeetingMinutesForm({ projectId, onSuccess, onCancel }: MeetingMinutesFormProps) {
  const createMeeting = useCreateMeeting(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      meeting_date: new Date().toISOString().split('T')[0],
      title: '',
      attendees_raw: '',
      agenda: '',
      notes: '',
      action_items_raw: '',
    },
  });

  function onSubmit(values: FormValues) {
    const attendees = values.attendees_raw
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    if (attendees.length === 0) {
      form.setError('attendees_raw', { message: 'At least one attendee is required' });
      return;
    }

    let action_items:
      | Array<{ description: string; assignee?: string; due_date?: string }>
      | undefined;
    if (values.action_items_raw?.trim()) {
      try {
        action_items = JSON.parse(values.action_items_raw);
      } catch {
        // Parse as plain text lines — each line is a description
        action_items = values.action_items_raw
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((description) => ({ description }));
      }
    }

    createMeeting.mutate(
      {
        meeting_date: values.meeting_date,
        title: values.title,
        attendees,
        agenda: values.agenda || undefined,
        notes: values.notes,
        action_items,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="meeting_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meeting Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
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
                  <Input placeholder="e.g. Site Progress Meeting" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="attendees_raw"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attendees * (comma-separated)</FormLabel>
              <FormControl>
                <Input placeholder="David G., Mina T., Site Supervisor" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="agenda"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agenda</FormLabel>
              <FormControl>
                <Textarea placeholder="Meeting agenda items..." rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Meeting notes and discussion points..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="action_items_raw"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Action Items (one per line)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={`Order lumber by Friday\nSchedule inspection for next week`}
                  rows={3}
                  {...field}
                />
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
              disabled={createMeeting.isPending}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createMeeting.isPending}>
            {createMeeting.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Meeting Minutes
          </Button>
        </div>
      </form>
    </Form>
  );
}
