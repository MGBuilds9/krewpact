'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  trigger_type: z.enum([
    'manual',
    'lead_created',
    'lead_stage_changed',
    'score_threshold',
    'tag_added',
    'form_submitted',
  ]),
  division: z.enum([
    'contracting',
    'homes',
    'wood',
    'telecom',
    'group-inc',
    'management',
    'all',
  ]),
});

type FormValues = z.infer<typeof schema>;

const triggerLabels: Record<string, string> = {
  manual: 'Manual',
  lead_created: 'Lead Created',
  lead_stage_changed: 'Lead Stage Changed',
  score_threshold: 'Score Threshold Reached',
  tag_added: 'Tag Added',
  form_submitted: 'Form Submitted',
};

const divisionLabels: Record<string, string> = {
  contracting: 'MDM Contracting',
  homes: 'MDM Homes',
  wood: 'MDM Wood',
  telecom: 'MDM Telecom',
  'group-inc': 'MDM Group Inc.',
  management: 'MDM Management',
  all: 'All Divisions',
};

export default function NewSequencePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      trigger_type: 'manual',
      division: 'contracting',
    },
  });

  const triggerType = watch('trigger_type');
  const division = watch('division');

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await fetch('/api/crm/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'Failed to create sequence');
      }

      const data = await res.json();
      const id = data?.data?.id ?? data?.id;
      if (id) {
        router.push(`/crm/sequences/${id}`);
      } else {
        router.push('/crm/sequences');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back nav */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link href="/crm/sequences">
            <ArrowLeft className="h-4 w-4" />
            Back to Sequences
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">New Outreach Sequence</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Set up a new automated sequence. You can add steps after creating it.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Sequence Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Initial Outreach — Contracting Leads"
              {...register('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional — describe the purpose of this sequence"
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Trigger type */}
          <div className="space-y-1.5">
            <Label>
              Trigger <span className="text-destructive">*</span>
            </Label>
            <Select
              value={triggerType}
              onValueChange={(val) =>
                setValue('trigger_type', val as FormValues['trigger_type'], { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select trigger..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(triggerLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.trigger_type && (
              <p className="text-xs text-destructive">{errors.trigger_type.message}</p>
            )}
          </div>

          {/* Division */}
          <div className="space-y-1.5">
            <Label>
              Division <span className="text-destructive">*</span>
            </Label>
            <Select
              value={division}
              onValueChange={(val) =>
                setValue('division', val as FormValues['division'], { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select division..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(divisionLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.division && (
              <p className="text-xs text-destructive">{errors.division.message}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" asChild>
              <Link href="/crm/sequences">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Sequence
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
