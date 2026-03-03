/**
 * Lead stage transition logic.
 * Pure functions — no database or auth dependencies.
 */

export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'estimating'
  | 'proposal_sent'
  | 'won'
  | 'lost';

/**
 * Allowed transitions: key = current stage, value = array of valid next stages.
 * "lost" is a terminal state (no transitions out).
 * "won" is a terminal state (no transitions out).
 */
export const ALLOWED_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  new: ['contacted', 'qualified', 'lost'],
  contacted: ['qualified', 'lost'],
  qualified: ['estimating', 'lost'],
  estimating: ['proposal_sent', 'lost'],
  proposal_sent: ['won', 'lost'],
  won: [],
  lost: [],
};

export type TransitionResult = { valid: true } | { valid: false; reason: string };

/**
 * Validate whether a stage transition is allowed.
 */
export function validateTransition(currentStage: LeadStage, newStage: LeadStage): TransitionResult {
  if (currentStage === newStage) {
    return { valid: false, reason: `Already in stage '${currentStage}'` };
  }

  const allowed = ALLOWED_TRANSITIONS[currentStage];

  if (!allowed || allowed.length === 0) {
    return {
      valid: false,
      reason: `Stage '${currentStage}' is terminal — no transitions allowed`,
    };
  }

  if (!allowed.includes(newStage)) {
    return {
      valid: false,
      reason: `Transition from '${currentStage}' to '${newStage}' is not allowed. Valid transitions: ${allowed.join(', ')}`,
    };
  }

  return { valid: true };
}
