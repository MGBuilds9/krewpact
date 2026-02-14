/**
 * Estimate status transition logic.
 * Pure functions — no database or auth dependencies.
 */

export type EstimateStatus =
  | 'draft'
  | 'review'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'superseded';

/**
 * Allowed transitions: key = current status, value = array of valid next statuses.
 * Terminal: approved, rejected, superseded have no transitions out.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<EstimateStatus, EstimateStatus[]> = {
  draft: ['review'],
  review: ['sent', 'draft'],
  sent: ['approved', 'rejected'],
  approved: [],
  rejected: [],
  superseded: [],
};

export type StatusTransitionResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Validate whether a status transition is allowed.
 */
export function validateStatusTransition(
  currentStatus: EstimateStatus,
  newStatus: EstimateStatus,
): StatusTransitionResult {
  if (currentStatus === newStatus) {
    return { valid: false, reason: `Already in status '${currentStatus}'` };
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];

  if (!allowed || allowed.length === 0) {
    return {
      valid: false,
      reason: `Status '${currentStatus}' is terminal — no transitions allowed`,
    };
  }

  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      reason: `Transition from '${currentStatus}' to '${newStatus}' is not allowed. Valid transitions: ${allowed.join(', ')}`,
    };
  }

  return { valid: true };
}
