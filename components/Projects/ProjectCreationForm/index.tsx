'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useProjectCreationForm } from '@/hooks/useProjectCreationForm';

import { ProjectBasicInfoStep } from './ProjectBasicInfoStep';
import { ProjectDetailsStep } from './ProjectDetailsStep';
import { ProjectReviewStep } from './ProjectReviewStep';
import { ProjectStepNav } from './ProjectStepNav';
import { ProjectTeamStep } from './ProjectTeamStep';
import { type ProjectCreationFormProps, STEPS } from './types';

export function ProjectCreationForm({ onClose, onSuccess }: ProjectCreationFormProps) {
  const {
    isSubmitting,
    currentStep,
    setCurrentStep,
    formData,
    projectMembers,
    updateField,
    addProjectMember,
    removeProjectMember,
    updateProjectMember,
    formatSiteAddress,
    onSubmit,
  } = useProjectCreationForm(onSuccess);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ProjectBasicInfoStep formData={formData} updateField={updateField} />;
      case 2:
        return <ProjectDetailsStep formData={formData} updateField={updateField} />;
      case 3:
        return (
          <ProjectTeamStep
            projectMembers={projectMembers}
            addProjectMember={addProjectMember}
            removeProjectMember={removeProjectMember}
            updateProjectMember={updateProjectMember}
          />
        );
      case 4:
        return (
          <ProjectReviewStep
            formData={formData}
            projectMembers={projectMembers}
            formatSiteAddress={formatSiteAddress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <ProjectStepNav currentStep={currentStep} />

      {renderStepContent()}

      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {currentStep < STEPS.length ? (
            <Button onClick={() => setCurrentStep((s) => Math.min(STEPS.length, s + 1))}>
              Next
            </Button>
          ) : (
            <Button onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectCreationForm;
