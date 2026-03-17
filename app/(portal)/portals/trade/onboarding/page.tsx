'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const STEPS = [
  { id: 'contact', label: 'Contact Details', fields: ['company_name', 'contact_name', 'phone'] },
  {
    id: 'insurance',
    label: 'Insurance & WSIB',
    fields: ['insurance_expiry', 'wsib_number', 'wsib_expiry'],
  },
  { id: 'trades', label: 'Trade Specialties', fields: ['trade_specialties', 'certifications'] },
  { id: 'confirm', label: 'Review & Submit', fields: [] },
];

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
];

const INPUT_CLS =
  'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none';

interface FormData {
  company_name: string;
  contact_name: string;
  phone: string;
  insurance_expiry: string;
  wsib_number: string;
  wsib_expiry: string;
  trade_specialties: string[];
  certifications: string;
}

type Updater = (key: keyof FormData, value: string | string[]) => void;

function StepContact({ form, update }: { form: FormData; update: Updater }) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Company Name *</span>
        <input
          id="company_name"
          value={form.company_name}
          onChange={(e) => update('company_name', e.target.value)}
          className={INPUT_CLS}
          placeholder="Acme Trades Inc."
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Primary Contact Name *</span>
        <input
          id="contact_name"
          value={form.contact_name}
          onChange={(e) => update('contact_name', e.target.value)}
          className={INPUT_CLS}
          placeholder="John Smith"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Phone</span>
        <input
          id="phone"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          className={INPUT_CLS}
          placeholder="+1-416-555-0100"
        />
      </label>
    </>
  );
}

function StepInsurance({ form, update }: { form: FormData; update: Updater }) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Insurance Expiry Date</span>
        <input
          id="insurance_expiry"
          type="date"
          value={form.insurance_expiry}
          onChange={(e) => update('insurance_expiry', e.target.value)}
          className={INPUT_CLS}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">WSIB Account Number</span>
        <input
          id="wsib_number"
          value={form.wsib_number}
          onChange={(e) => update('wsib_number', e.target.value)}
          className={INPUT_CLS}
          placeholder="1234567890"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">WSIB Clearance Expiry</span>
        <input
          id="wsib_expiry"
          type="date"
          value={form.wsib_expiry}
          onChange={(e) => update('wsib_expiry', e.target.value)}
          className={INPUT_CLS}
        />
      </label>
    </>
  );
}

function StepTrades({
  form,
  update,
  toggle,
}: {
  form: FormData;
  update: Updater;
  toggle: (t: string) => void;
}) {
  return (
    <>
      <p className="text-sm font-medium text-gray-700">Select your trade specialties</p>
      <div className="flex flex-wrap gap-2">
        {TRADE_OPTIONS.map((trade) => (
          <button
            key={trade}
            type="button"
            onClick={() => toggle(trade)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${form.trade_specialties.includes(trade) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}
          >
            {trade}
          </button>
        ))}
      </div>
      <label className="block mt-4">
        <span className="text-sm font-medium text-gray-700">
          Certifications (e.g., Red Seal, CWB)
        </span>
        <textarea
          id="certifications"
          value={form.certifications}
          onChange={(e) => update('certifications', e.target.value)}
          rows={3}
          className={`${INPUT_CLS} resize-none`}
          placeholder="List any relevant certifications..."
        />
      </label>
    </>
  );
}

function StepReview({ form, error }: { form: FormData; error: string | null }) {
  const rows: [string, string][] = [
    ['Company', form.company_name],
    ['Contact', form.contact_name],
    ['Phone', form.phone],
    ['Insurance Expiry', form.insurance_expiry],
    ['WSIB #', form.wsib_number],
    ['Trades', form.trade_specialties.join(', ')],
  ];
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-800">Review your details</h3>
      {rows.map(([label, val]) => (
        <div key={label} className="flex text-sm">
          <span className="w-36 text-gray-500 shrink-0">{label}</span>
          <span className="text-gray-900 font-medium">{val || '—'}</span>
        </div>
      ))}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}

export default function TradeOnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    company_name: '',
    contact_name: '',
    phone: '',
    insurance_expiry: '',
    wsib_number: '',
    wsib_expiry: '',
    trade_specialties: [],
    certifications: '',
  });

  const totalSteps = STEPS.length;
  const currentStep = STEPS[step];
  const progress = ((step + 1) / totalSteps) * 100;
  const update = (key: keyof FormData, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const toggleTrade = (trade: string) =>
    setForm((prev) => ({
      ...prev,
      trade_specialties: prev.trade_specialties.includes(trade)
        ? prev.trade_specialties.filter((t) => t !== trade)
        : [...prev.trade_specialties, trade],
    }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/portals/accounts/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Submission failed');
      }
      router.push('/portals/trade');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{currentStep.label}</span>
          <span className="text-xs text-gray-400">
            Step {step + 1} of {totalSteps}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-orange-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        {step === 0 && <StepContact form={form} update={update} />}
        {step === 1 && <StepInsurance form={form} update={update} />}
        {step === 2 && <StepTrades form={form} update={update} toggle={toggleTrade} />}
        {step === 3 && <StepReview form={form} error={error} />}
      </div>
      <div className="flex justify-between">
        <button
          disabled={step === 0}
          onClick={() => {
            if (step > 0) setStep((s) => s - 1);
          }}
          className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
        >
          Back
        </button>
        {step < totalSteps - 1 ? (
          <button
            onClick={() => {
              if (step < totalSteps - 1) setStep((s) => s + 1);
            }}
            className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60 rounded-lg"
          >
            {submitting ? 'Submitting…' : 'Complete Onboarding'}
          </button>
        )}
      </div>
    </div>
  );
}
