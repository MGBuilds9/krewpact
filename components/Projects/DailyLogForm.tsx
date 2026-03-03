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
import { useCreateDailyLog, useUpdateDailyLog } from '@/hooks/useProjectExtended';
import type { DailyLog } from '@/hooks/useProjectExtended';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  log_date: z.string().min(1, 'Date is required'),
  crew_count: z.string().optional(),
  work_summary: z.string().optional(),
  delays: z.string().optional(),
  safety_notes: z.string().optional(),
  weather_condition: z.string().optional(),
  weather_temp: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface DailyLogFormProps {
  projectId: string;
  initialData?: DailyLog;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DailyLogForm({ projectId, initialData, onSuccess, onCancel }: DailyLogFormProps) {
  const createLog = useCreateDailyLog(projectId);
  const updateLog = useUpdateDailyLog(projectId);
  const isEditing = !!initialData;

  const weatherInit = initialData?.weather as Record<string, string> | null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      log_date: initialData?.log_date ?? new Date().toISOString().split('T')[0],
      crew_count: initialData?.crew_count?.toString() ?? '',
      work_summary: initialData?.work_summary ?? '',
      delays: initialData?.delays ?? '',
      safety_notes: initialData?.safety_notes ?? '',
      weather_condition: weatherInit?.condition ?? '',
      weather_temp: weatherInit?.temp?.toString() ?? '',
    },
  });

  const isPending = createLog.isPending || updateLog.isPending;

  function onSubmit(values: FormValues) {
    const crewCount = values.crew_count ? parseInt(values.crew_count, 10) : undefined;
    if (values.crew_count && isNaN(crewCount!)) {
      form.setError('crew_count', { message: 'Must be a valid integer' });
      return;
    }

    const weather: Record<string, unknown> = {};
    if (values.weather_condition) weather.condition = values.weather_condition;
    if (values.weather_temp) weather.temp = parseFloat(values.weather_temp);

    if (isEditing) {
      updateLog.mutate(
        {
          logId: initialData.id,
          crew_count: crewCount ?? null,
          work_summary: values.work_summary || null,
          delays: values.delays || null,
          safety_notes: values.safety_notes || null,
          weather: Object.keys(weather).length > 0 ? weather : null,
        },
        {
          onSuccess: () => {
            form.reset();
            onSuccess?.();
          },
        },
      );
    } else {
      createLog.mutate(
        {
          log_date: values.log_date,
          crew_count: crewCount,
          work_summary: values.work_summary || undefined,
          delays: values.delays || undefined,
          safety_notes: values.safety_notes || undefined,
          weather: Object.keys(weather).length > 0 ? weather : undefined,
        },
        {
          onSuccess: () => {
            form.reset();
            onSuccess?.();
          },
        },
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="log_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isEditing} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="crew_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Crew Count</FormLabel>
                <FormControl>
                  <Input type="number" min="0" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="weather_condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weather Condition</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. sunny, rainy, cloudy" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weather_temp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature (°C)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="e.g. 12" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="work_summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Summary</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe work completed today..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="delays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delays</FormLabel>
              <FormControl>
                <Textarea placeholder="Any delays or issues encountered..." rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="safety_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Safety Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Safety observations, incidents, toolbox talks..."
                  rows={2}
                  {...field}
                />
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
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Update Log' : 'Create Log'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
