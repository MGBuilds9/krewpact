'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateBCPIncident } from '@/hooks/useGovernance';
import { bcpIncidentCreateSchema } from '@/lib/validators/migration';
import { toast } from 'sonner';

type FormValues = z.infer<typeof bcpIncidentCreateSchema>;

interface BCPIncidentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BCPIncidentForm({ onSuccess, onCancel }: BCPIncidentFormProps) {
  const create = useCreateBCPIncident();

  const form = useForm<FormValues>({
    resolver: zodResolver(bcpIncidentCreateSchema),
    defaultValues: { incident_number: '', severity: 'sev3', title: '', summary: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync(values);
      toast.success('BCP incident declared');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to declare incident');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="incident_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Incident Number</FormLabel>
                <FormControl><Input placeholder="INC-2026-001" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severity</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sev1">SEV1 — Critical</SelectItem>
                    <SelectItem value="sev2">SEV2 — Major</SelectItem>
                    <SelectItem value="sev3">SEV3 — Minor</SelectItem>
                    <SelectItem value="sev4">SEV4 — Low</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl><Input placeholder="Incident title" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary</FormLabel>
              <FormControl><Textarea placeholder="Incident summary..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={create.isPending} variant="destructive">
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Declare Incident
          </Button>
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        </div>
      </form>
    </Form>
  );
}
