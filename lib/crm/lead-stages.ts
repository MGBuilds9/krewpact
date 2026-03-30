/**
 * Lead stage transition logic.
 * Pure functions — no database or auth dependencies.
 */

export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'nurture'
  | 'won'
  | 'lost';

/**
 * Allowed transitions: key = current stage, value = array of valid next stages.
 * "lost" is a terminal state (no transitions out).
 * "won" is a terminal state (no transitions out).
 */
export const ALLOWED_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  new: ['qualified', 'lost'],
  qualified: ['contacted', 'lost'],
  contacted: ['proposal', 'nurture', 'lost'],
  proposal: ['negotiation', 'nurture', 'lost'],
  negotiation: ['won', 'nurture', 'lost'],
  nurture: ['qualified', 'contacted', 'lost'],
  won: [],
  lost: [],
};

export type TransitionResult = { valid: true } | { valid: false; reason: string };

/** Ordered pipeline stages for display (excludes nurture/lost) */
export const LEAD_PIPELINE_STAGES: { key: LeadStage; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
];

/** Ordered stage keys for pipeline display */
export const LEAD_PIPELINE_ORDER: LeadStage[] = LEAD_PIPELINE_STAGES.map((s) => s.key);

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
