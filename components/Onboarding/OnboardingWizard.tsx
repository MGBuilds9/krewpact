'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import { showToast } from '@/lib/toast';
import {
  type CompanyProfile,
  companyProfileSchema,
  type DivisionCode,
  type DivisionSelection,
  divisionSelectionSchema,
  teamInviteSchema,
} from '@/lib/validators/org';

import { type PendingInvite, TOTAL_STEPS } from './onboarding-constants';
import { StepCompanyProfile } from './StepCompanyProfile';
import { StepDivisionSetup } from './StepDivisionSetup';
import { StepInviteTeam } from './StepInviteTeam';
import { StepSuccess } from './StepSuccess';
import { WizardProgress } from './WizardProgress';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

// eslint-disable-next-line max-lines-per-function
export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const companyForm = useForm<CompanyProfile>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: { name: '', address: '', phone: '' },
  });
  const divisionForm = useForm<DivisionSelection>({
    resolver: zodResolver(divisionSelectionSchema),
    defaultValues: { divisions: [] },
  });
  const inviteForm = useForm<{ email: string; role: string }>({
    resolver: zodResolver(teamInviteSchema),
    defaultValues: { email: '', role: '' },
  });

  const progressPercent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  const handleNext = useCallback(() => setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const handleBack = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 1)), []);

  const handleDivisionToggle = (code: DivisionCode, checked: boolean) => {
    const current = divisionForm.getValues('divisions');
    divisionForm.setValue(
      'divisions',
      checked ? [...current, code] : current.filter((d) => d !== code),
      { shouldValidate: true },
    );
  };

  const handleAddInvite = inviteForm.handleSubmit((data) => {
    if (pendingInvites.some((inv) => inv.email === data.email)) {
      showToast.error('This email has already been added');
      return;
    }
    setPendingInvites((prev) => [...prev, { email: data.email, role: data.role }]);
    inviteForm.reset();
    showToast.success(`Invite added for ${data.email}`);
  });

  const handleComplete = () => {
    showToast.success('Onboarding complete!');
    onComplete?.();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <WizardProgress
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        progressPercent={progressPercent}
      />
      {currentStep === 1 && (
        <StepCompanyProfile
          form={companyForm}
          onSkip={handleNext}
          onSubmit={companyForm.handleSubmit(() => {
            showToast.success('Company profile saved');
            handleNext();
          })}
        />
      )}
      {currentStep === 2 && (
        <StepDivisionSetup
          form={divisionForm}
          onBack={handleBack}
          onSkip={handleNext}
          onSubmit={divisionForm.handleSubmit(() => {
            showToast.success('Divisions configured');
            handleNext();
          })}
          onToggle={handleDivisionToggle}
        />
      )}
      {currentStep === 3 && (
        <StepInviteTeam
          inviteForm={inviteForm}
          pendingInvites={pendingInvites}
          onBack={handleBack}
          onSkip={handleNext}
          onNext={handleNext}
          onAddInvite={handleAddInvite}
          onRemove={(email) =>
            setPendingInvites((prev) => prev.filter((inv) => inv.email !== email))
          }
        />
      )}
      {currentStep === 4 && <StepSuccess onBack={handleBack} onComplete={handleComplete} />}
    </div>
  );
}
