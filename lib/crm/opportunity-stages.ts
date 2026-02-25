/**
 * Opportunity stage transition logic.
 * Pure functions — no database or auth dependencies.
 */

export type OpportunityStage =
  | 'intake'
  | 'site_visit'
  | 'estimating'
  | 'proposal'
  | 'negotiation'
  | 'contracted'
  | 'closed_lost';

/**
 * Allowed transitions: key = current stage, value = array of valid next stages.
 * "contracted" is a terminal state (won — no transitions out).
 * "closed_lost" is a terminal state (no transitions out).
 */
export const ALLOWED_TRANSITIONS: Record<OpportunityStage, OpportunityStage[]> = {
  intake: ['site_visit', 'closed_lost'],
  site_visit: ['estimating', 'closed_lost'],
  estimating: ['proposal', 'closed_lost'],
  proposal: ['negotiation', 'closed_lost'],
  negotiation: ['contracted', 'closed_lost'],
  contracted: [],
  closed_lost: [],
};

export type TransitionResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Validate whether an opportunity stage transition is allowed.
 */
export function validateTransition(
  currentStage: OpportunityStage,
  newStage: OpportunityStage,
): TransitionResult {
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
