export interface ProjectCreationFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export interface ProjectMember {
  user_id: string;
  member_role: string;
  allocation_pct: number | null;
}

export interface ProjectFormData {
  project_name: string;
  project_number: string;
  description: string;
  site_street: string;
  site_city: string;
  site_province: string;
  site_postal_code: string;
  start_date: string;
  target_completion_date: string;
  baseline_budget: string;
  status: string;
}

export const INITIAL_FORM_DATA: ProjectFormData = {
  project_name: '',
  project_number: '',
  description: '',
  site_street: '',
  site_city: '',
  site_province: '',
  site_postal_code: '',
  start_date: '',
  target_completion_date: '',
  baseline_budget: '',
  status: 'planning',
};

export const STEPS = [
  { id: 1, title: 'Basic Information' },
  { id: 2, title: 'Project Details' },
  { id: 3, title: 'Team Assignment' },
  { id: 4, title: 'Review & Create' },
];
