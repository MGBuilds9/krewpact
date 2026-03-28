'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import {
  SequenceFormFields,
  sequenceFormSchema,
  type SequenceFormValues,
} from './_components/SequenceFormFields';

async function submitSequence(values: SequenceFormValues): Promise<string | null> {
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
  return data?.data?.id ?? data?.id ?? null;
}

export default function NewSequencePage() {
  const { push: orgPush, orgPath } = useOrgRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SequenceFormValues>({
    resolver: zodResolver(sequenceFormSchema),
    defaultValues: { trigger_type: 'manual', division: 'contracting' },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const triggerType = watch('trigger_type');

  const division = watch('division');

  const onSubmit = async (values: SequenceFormValues) => {
    setServerError(null);
    try {
      const id = await submitSequence(values);
      orgPush(id ? `/crm/sequences/${id}` : '/crm/sequences');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href={orgPath('/crm/sequences')}>
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
          <SequenceFormFields
            register={register}
            errors={errors}
            triggerType={triggerType}
            division={division}
            onTriggerChange={(val) => setValue('trigger_type', val, { shouldValidate: true })}
            onDivisionChange={(val) => setValue('division', val, { shouldValidate: true })}
          />
          {serverError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" asChild>
              <Link href={orgPath('/crm/sequences')}>Cancel</Link>
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
