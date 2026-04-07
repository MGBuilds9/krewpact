'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  INITIAL_FORM_DATA,
  type ProjectFormData,
  type ProjectMember,
} from '@/components/Projects/ProjectCreationForm/types';
import { requireConcreteDivision, useDivision } from '@/contexts/DivisionContext';
import { type Project, useCreateProject } from '@/hooks/useProjects';

function buildSiteAddress(formData: ProjectFormData): Record<string, string> | undefined {
  const addr: Record<string, string> = {};
  if (formData.site_street) addr.street = formData.site_street;
  if (formData.site_city) addr.city = formData.site_city;
  if (formData.site_province) addr.province = formData.site_province;
  if (formData.site_postal_code) addr.postal_code = formData.site_postal_code;
  return Object.keys(addr).length > 0 ? addr : undefined;
}

function formatSiteAddress(formData: ProjectFormData): string {
  return [
    formData.site_street,
    formData.site_city,
    formData.site_province,
    formData.site_postal_code,
  ]
    .filter(Boolean)
    .join(', ');
}

export function useProjectCreationForm(onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>(INITIAL_FORM_DATA);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const { activeDivision, userDivisions } = useDivision();
  const createProject = useCreateProject();
  // New projects must be scoped to a concrete division. When the user is in
  // "All Divisions" view, fall back to their primary division.
  const writeDivisionId = requireConcreteDivision(activeDivision, userDivisions);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addProjectMember = () => {
    setProjectMembers((prev) => [
      ...prev,
      { user_id: '', member_role: 'worker', allocation_pct: null },
    ]);
  };

  const removeProjectMember = (index: number) => {
    setProjectMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateProjectMember = (
    index: number,
    field: keyof ProjectMember,
    value: string | number | null,
  ) => {
    setProjectMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const buildProjectData = () => {
    const budget = formData.baseline_budget ? parseFloat(formData.baseline_budget) : undefined;
    return {
      project_name: formData.project_name,
      project_number: formData.project_number || undefined,
      status: (formData.status || 'planning') as Project['status'],
      start_date: formData.start_date || undefined,
      target_completion_date: formData.target_completion_date || undefined,
      baseline_budget: budget,
      current_budget: budget,
      division_id: writeDivisionId || undefined,
      site_address: buildSiteAddress(formData) ?? null,
    };
  };

  const onSubmit = async () => {
    if (!formData.project_name.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (!writeDivisionId) {
      toast.error('Select a division before creating a project');
      return;
    }
    setIsSubmitting(true);
    try {
      await createProject.mutateAsync(buildProjectData());
      toast.success(`"${formData.project_name}" has been created`);
      onSuccess?.();
    } catch {
      toast.error('Error creating project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    currentStep,
    setCurrentStep,
    formData,
    projectMembers,
    updateField,
    addProjectMember,
    removeProjectMember,
    updateProjectMember,
    formatSiteAddress: () => formatSiteAddress(formData),
    onSubmit,
  };
}
