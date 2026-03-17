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
import { Textarea } from '@/components/ui/textarea';
import type { DailyLog } from '@/hooks/useProjectExtended';
import { useCreateDailyLog, useUpdateDailyLog } from '@/hooks/useProjectExtended';

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

function buildWeather(values: FormValues): Record<string, unknown> | null {
  const weather: Record<string, unknown> = {};
  if (values.weather_condition) weather.condition = values.weather_condition;
  if (values.weather_temp) weather.temp = parseFloat(values.weather_temp);
  return Object.keys(weather).length > 0 ? weather : null;
}

function buildWeatherDefaults(initialData?: DailyLog) {
  const w = initialData?.weather as Record<string, string> | null;
  return { weather_condition: w?.condition ?? '', weather_temp: w?.temp?.toString() ?? '' };
}

function buildDefaultValues(initialData?: DailyLog) {
  return {
    log_date: initialData?.log_date ?? new Date().toISOString().split('T')[0],
    crew_count: initialData?.crew_count?.toString() ?? '',
    work_summary: initialData?.work_summary ?? '',
    delays: initialData?.delays ?? '',
    safety_notes: initialData?.safety_notes ?? '',
    ...buildWeatherDefaults(initialData),
  };
}

function parseCrewCount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return isNaN(n) ? undefined : n;
}

export function DailyLogForm({ projectId, initialData, onSuccess, onCancel }: DailyLogFormProps) {
  const createLog = useCreateDailyLog(projectId);
  const updateLog = useUpdateDailyLog(projectId);
  const isEditing = !!initialData;
  const cb = {
    onSuccess: () => {
      form.reset();
      onSuccess?.();
    },
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(initialData),
  });

  const isPending = createLog.isPending || updateLog.isPending;

  function onSubmit(values: FormValues) {
    const crewCount = parseCrewCount(values.crew_count);
    if (values.crew_count && crewCount === undefined) {
      form.setError('crew_count', { message: 'Must be a valid integer' });
      return;
    }
    const weather = buildWeather(values);
    if (isEditing) {
      updateLog.mutate(
        {
          logId: initialData.id,
          crew_count: crewCount ?? null,
          work_summary: values.work_summary || null,
          delays: values.delays || null,
          safety_notes: values.safety_notes || null,
          weather,
        },
        cb,
      );
    } else {
      createLog.mutate(
        {
          log_date: values.log_date,
          crew_count: crewCount,
          work_summary: values.work_summary || undefined,
          delays: values.delays || undefined,
          safety_notes: values.safety_notes || undefined,
          weather: weather ?? undefined,
        },
        cb,
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
