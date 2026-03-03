/**
 * Maps KrewPact project data to ERPNext Project doctype format.
 * Pure function — no side effects or database calls.
 */

export interface ProjectMapInput {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
  start_date: string | null;
  target_completion_date: string | null;
  baseline_budget: number | null;
  account_id: string | null;
  division_id: string | null;
}

/**
 * Map a KrewPact project to an ERPNext Project document.
 */
export function mapProjectToErp(project: ProjectMapInput): Record<string, unknown> {
  return {
    project_name: `${project.project_number} — ${project.project_name}`,
    status: mapProjectStatus(project.status),
    expected_start_date: project.start_date,
    expected_end_date: project.target_completion_date,
    estimated_costing: project.baseline_budget || 0,
    customer: project.account_id || '',
    department: project.division_id || '',
    currency: 'CAD',
    krewpact_id: project.id,
  };
}

function mapProjectStatus(status: string): string {
  const statusMap: Record<string, string> = {
    planning: 'Open',
    active: 'Open',
    on_hold: 'Hold',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || 'Open';
}
