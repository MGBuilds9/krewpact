/**
 * Maps KrewPact task data to ERPNext Task doctype format.
 * Pure function — no side effects or database calls.
 */

export interface TaskMapInput {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  assigned_user_id: string | null;
  due_at: string | null;
  start_at: string | null;
  completed_at: string | null;
}

/**
 * Map a KrewPact task to an ERPNext Task document.
 */
export function mapTaskToErp(task: TaskMapInput): Record<string, unknown> {
  return {
    subject: task.title,
    description: task.description || '',
    project: task.project_id,
    status: mapTaskStatus(task.status),
    priority: mapTaskPriority(task.priority),
    assigned_to: task.assigned_user_id || '',
    exp_start_date: task.start_at ? task.start_at.split('T')[0] : null,
    exp_end_date: task.due_at ? task.due_at.split('T')[0] : null,
    completed_on: task.completed_at ? task.completed_at.split('T')[0] : null,
    krewpact_id: task.id,
  };
}

function mapTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    todo: 'Open',
    in_progress: 'Working',
    blocked: 'Pending Review',
    done: 'Completed',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || 'Open';
}

function mapTaskPriority(priority: string | null): string {
  const priorityMap: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };
  return priorityMap[priority || 'medium'] || 'Medium';
}
