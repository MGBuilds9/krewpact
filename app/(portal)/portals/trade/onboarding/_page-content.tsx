'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  type ContactValues,
  type FullFormData,
  type InsuranceValues,
  StepContact,
  StepInsurance,
  StepReview,
  StepTrades,
  type TradesValues,
} from './_components/OnboardingSteps';

const TOTAL_STEPS = 4;
const STEP_LABELS = ['Contact Details', 'Insurance & WSIB', 'Trade Specialties', 'Review & Submit'];

export default function TradeOnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<FullFormData>>({
    trade_specialties: [],
  });

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const mergeAndAdvance = (values: Partial<FullFormData>) => {
    setFormData((prev) => ({ ...prev, ...values }));
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/portals/accounts/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Submission failed');
      }
      router.push('/portals/trade');
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{STEP_LABELS[step]}</span>
          <span className="text-xs text-gray-400" aria-live="polite">
            Step {step + 1} of {TOTAL_STEPS}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-label={`Onboarding progress: step ${step + 1} of ${TOTAL_STEPS}`}
          className="h-2 rounded-full bg-gray-200"
        >
          <div
            className="h-2 rounded-full bg-orange-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        {step === 0 && (
          <StepContact
            defaults={{
              company_name: formData.company_name ?? '',
              contact_name: formData.contact_name ?? '',
              phone: formData.phone ?? '',
            }}
            onNext={(values: ContactValues) => mergeAndAdvance(values)}
          />
        )}
        {step === 1 && (
          <StepInsurance
            defaults={{
              insurance_expiry: formData.insurance_expiry ?? '',
              wsib_number: formData.wsib_number ?? '',
              wsib_expiry: formData.wsib_expiry ?? '',
            }}
            onNext={(values: InsuranceValues) => mergeAndAdvance(values)}
            onBack={() => setStep((s) => s - 1)}
          />
        )}
        {step === 2 && (
          <StepTrades
            defaults={{
              trade_specialties: formData.trade_specialties ?? [],
              certifications: formData.certifications ?? '',
            }}
            onNext={(values: TradesValues) => mergeAndAdvance(values)}
            onBack={() => setStep((s) => s - 1)}
          />
        )}
        {step === 3 && (
          <StepReview
            form={formData as FullFormData}
            onBack={() => setStep((s) => s - 1)}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={submitError}
          />
        )}
      </div>
    </div>
  );
}
