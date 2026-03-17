'use client';

import { STEPS } from './types';

interface ProjectStepNavProps {
  currentStep: number;
}

export function ProjectStepNav({ currentStep }: ProjectStepNavProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= step.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.id}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-12 h-1 mx-2 ${currentStep > step.id ? 'bg-primary' : 'bg-muted'}`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
      </p>
    </>
  );
}
