'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const TRADE_OPTIONS = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Framing',
  'Drywall',
  'Flooring',
  'Roofing',
  'Concrete',
  'Masonry',
  'Painting',
  'Landscaping',
  'Glass & Glazing',
  'Steel / Structural',
  'Other',
] as const;

const contactSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  contact_name: z.string().min(1, 'Contact name is required'),
  phone: z.string().optional(),
});

const insuranceSchema = z.object({
  insurance_expiry: z.string().optional(),
  wsib_number: z.string().optional(),
  wsib_expiry: z.string().optional(),
});

const tradesSchema = z.object({
  trade_specialties: z.array(z.string()).min(1, 'Select at least one trade specialty'),
  certifications: z.string().optional(),
});

export type ContactValues = z.infer<typeof contactSchema>;
export type InsuranceValues = z.infer<typeof insuranceSchema>;
export type TradesValues = z.infer<typeof tradesSchema>;
export interface FullFormData extends ContactValues, InsuranceValues, TradesValues {}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-600 mt-1" role="alert">
      {message}
    </p>
  );
}

export function StepContact({
  onNext,
  defaults,
}: {
  onNext: (values: ContactValues) => void;
  defaults: Partial<ContactValues>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaults,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div>
        <Label htmlFor="company_name">
          Company Name <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="company_name"
          {...register('company_name')}
          placeholder="Acme Trades Inc."
          className="mt-1"
          aria-required="true"
          aria-describedby={errors.company_name ? 'company_name_error' : undefined}
        />
        <FieldError message={errors.company_name?.message} />
      </div>
      <div>
        <Label htmlFor="contact_name">
          Primary Contact Name <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="contact_name"
          {...register('contact_name')}
          placeholder="John Smith"
          className="mt-1"
          aria-required="true"
          aria-describedby={errors.contact_name ? 'contact_name_error' : undefined}
        />
        <FieldError message={errors.contact_name?.message} />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" {...register('phone')} placeholder="+1-416-555-0100" className="mt-1" />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Next →</Button>
      </div>
    </form>
  );
}

export function StepInsurance({
  onNext,
  onBack,
  defaults,
}: {
  onNext: (values: InsuranceValues) => void;
  onBack: () => void;
  defaults: Partial<InsuranceValues>;
}) {
  const { register, handleSubmit } = useForm<InsuranceValues>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: defaults,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div>
        <Label htmlFor="insurance_expiry">Insurance Expiry Date</Label>
        <Input
          id="insurance_expiry"
          type="date"
          {...register('insurance_expiry')}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="wsib_number">WSIB Account Number</Label>
        <Input
          id="wsib_number"
          {...register('wsib_number')}
          placeholder="1234567890"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="wsib_expiry">WSIB Clearance Expiry</Label>
        <Input id="wsib_expiry" type="date" {...register('wsib_expiry')} className="mt-1" />
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next →</Button>
      </div>
    </form>
  );
}

export function StepTrades({
  onNext,
  onBack,
  defaults,
}: {
  onNext: (values: TradesValues) => void;
  onBack: () => void;
  defaults: Partial<TradesValues>;
}) {
  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { errors },
  } = useForm<TradesValues>({
    resolver: zodResolver(tradesSchema),
    defaultValues: { trade_specialties: [], ...defaults },
  });

  const selected = watch('trade_specialties') ?? [];

  const toggleTrade = (trade: string) => {
    const next = selected.includes(trade)
      ? selected.filter((t) => t !== trade)
      : [...selected, trade];
    setValue('trade_specialties', next, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Select your trade specialties <span aria-hidden="true">*</span>
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Trade specialties">
          {TRADE_OPTIONS.map((trade) => (
            <button
              key={trade}
              type="button"
              onClick={() => toggleTrade(trade)}
              aria-pressed={selected.includes(trade)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selected.includes(trade) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}
            >
              {trade}
            </button>
          ))}
        </div>
        <FieldError message={errors.trade_specialties?.message} />
      </div>
      <div>
        <Label htmlFor="certifications">Certifications (e.g., Red Seal, CWB)</Label>
        <Textarea
          id="certifications"
          {...register('certifications')}
          rows={3}
          className="mt-1 resize-none"
          placeholder="List any relevant certifications..."
        />
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next →</Button>
      </div>
    </form>
  );
}

export function StepReview({
  form,
  onBack,
  onSubmit,
  submitting,
  error,
}: {
  form: FullFormData;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const rows: [string, string][] = [
    ['Company', form.company_name],
    ['Contact', form.contact_name],
    ['Phone', form.phone ?? ''],
    ['Insurance Expiry', form.insurance_expiry ?? ''],
    ['WSIB #', form.wsib_number ?? ''],
    ['Trades', form.trade_specialties.join(', ')],
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Review your details</h3>
      {rows.map(([label, val]) => (
        <div key={label} className="flex text-sm">
          <span className="w-36 text-gray-500 shrink-0">{label}</span>
          <span className="text-gray-900 font-medium">{val || '—'}</span>
        </div>
      ))}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button type="button" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Complete Onboarding'}
        </Button>
      </div>
    </div>
  );
}
