'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { ProjectFormData } from './types';

interface ProjectBasicInfoStepProps {
  formData: ProjectFormData;
  updateField: (field: string, value: string) => void;
}

export function ProjectBasicInfoStep({ formData, updateField }: ProjectBasicInfoStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Project Name *</Label>
        <Input
          value={formData.project_name}
          onChange={(e) => updateField('project_name', e.target.value)}
          placeholder="Enter project name"
        />
      </div>
      <div>
        <Label>Project Number</Label>
        <Input
          value={formData.project_number}
          onChange={(e) => updateField('project_number', e.target.value)}
          placeholder="e.g., PRJ-2026-001"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe the project scope and objectives..."
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
}
