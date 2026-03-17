'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { ProjectFormData } from './types';

interface ProjectDetailsStepProps {
  formData: ProjectFormData;
  updateField: (field: string, value: string) => void;
}

export function ProjectDetailsStep({ formData, updateField }: ProjectDetailsStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Street Address</Label>
          <Input
            value={formData.site_street}
            onChange={(e) => updateField('site_street', e.target.value)}
            placeholder="123 Main St"
          />
        </div>
        <div>
          <Label>City</Label>
          <Input
            value={formData.site_city}
            onChange={(e) => updateField('site_city', e.target.value)}
            placeholder="Mississauga"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Province</Label>
          <Input
            value={formData.site_province}
            onChange={(e) => updateField('site_province', e.target.value)}
            placeholder="ON"
          />
        </div>
        <div>
          <Label>Postal Code</Label>
          <Input
            value={formData.site_postal_code}
            onChange={(e) => updateField('site_postal_code', e.target.value)}
            placeholder="L5B 1M2"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => updateField('start_date', e.target.value)}
          />
        </div>
        <div>
          <Label>Target Completion Date</Label>
          <Input
            type="date"
            value={formData.target_completion_date}
            onChange={(e) => updateField('target_completion_date', e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Baseline Budget</Label>
        <Input
          type="number"
          placeholder="0.00"
          step="0.01"
          value={formData.baseline_budget}
          onChange={(e) => updateField('baseline_budget', e.target.value)}
        />
      </div>
    </div>
  );
}
