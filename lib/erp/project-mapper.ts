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
 *
 * IMPORTANT: The sync handler (sync-project.ts) is responsible for resolving
 * account_id to the ERPNext Customer docname from erp_sync_map before calling
 * this function. The value passed as account_id must be the ERPNext Customer
 * docname, NOT the KrewPact UUID, or ERPNext customer field validation will fail.
 */
export function mapProjectToErp(project: ProjectMapInput): Record<string, unknown> {
  // ERPNext's `department` field is a link to the Department doctype, not a
  // free-text tag. MDM's divisions live as Cost Centers, not Departments, so
  // passing division_id here made ERPNext reject the insert with
  // "Could not find Department: <uuid>". Division→cost-center mapping belongs
  // on downstream records (Task, Timesheet, Expense Claim), not the Project
  // header.
  void project.division_id;
  const mapped: Record<string, unknown> = {
    project_name: `${project.project_number} — ${project.project_name}`,
    status: mapProjectStatus(project.status),
    expected_start_date: project.start_date,
    expected_end_date: project.target_completion_date,
    estimated_costing: project.baseline_budget || 0,
    currency: 'CAD',
    krewpact_id: project.id,
  };
  // Only include customer when the handler resolved it to a real ERPNext
  // Customer docname. Empty string triggers link-field validation errors.
  if (project.account_id) mapped.customer = project.account_id;
  return mapped;
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
