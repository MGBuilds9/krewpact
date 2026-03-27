'use client';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  progressPercent: number;
}

export function WizardProgress({ currentStep, totalSteps, progressPercent }: WizardProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Step {currentStep} of {totalSteps}
        </span>
        <span>{Math.round(progressPercent)}% complete</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Onboarding progress: step ${currentStep} of ${totalSteps}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
