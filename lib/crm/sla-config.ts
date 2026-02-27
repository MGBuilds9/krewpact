/**
 * SLA (Service Level Agreement) configuration for CRM stages.
 * Defines maximum allowed time in each stage before flagging as overdue.
 */

export interface SLAConfig {
  stage: string;
  maxHours: number;
  label: string;
}

/** SLA deadlines for lead stages (hours) */
export const LEAD_SLA_CONFIG: SLAConfig[] = [
  { stage: 'new', maxHours: 48, label: '48 hours' },
  { stage: 'qualified', maxHours: 120, label: '5 days' },
  { stage: 'estimating', maxHours: 168, label: '7 days' },
  { stage: 'proposal_sent', maxHours: 336, label: '14 days' },
];

/** SLA deadlines for opportunity stages (hours) */
export const OPPORTUNITY_SLA_CONFIG: SLAConfig[] = [
  { stage: 'intake', maxHours: 24, label: '24 hours' },
  { stage: 'site_visit', maxHours: 72, label: '3 days' },
  { stage: 'estimating', maxHours: 168, label: '7 days' },
  { stage: 'proposal', maxHours: 120, label: '5 days' },
  { stage: 'negotiation', maxHours: 336, label: '14 days' },
];

export interface SLAStatus {
  isOverdue: boolean;
  hoursRemaining: number;
  hoursElapsed: number;
  maxHours: number;
  label: string;
  percentUsed: number;
}

/**
 * Calculate SLA status for an entity at a given stage.
 */
export function calculateSLAStatus(
  stage: string,
  stageEnteredAt: string | Date | null,
  slaConfigs: SLAConfig[],
  now: Date = new Date()
): SLAStatus | null {
  const config = slaConfigs.find((c) => c.stage === stage);
  if (!config) return null;

  if (!stageEnteredAt) {
    return {
      isOverdue: false,
      hoursRemaining: config.maxHours,
      hoursElapsed: 0,
      maxHours: config.maxHours,
      label: config.label,
      percentUsed: 0,
    };
  }

  const enteredAt = new Date(stageEnteredAt);
  const elapsedMs = now.getTime() - enteredAt.getTime();
  const hoursElapsed = elapsedMs / (1000 * 60 * 60);
  const hoursRemaining = config.maxHours - hoursElapsed;

  return {
    isOverdue: hoursRemaining <= 0,
    hoursRemaining: Math.max(0, hoursRemaining),
    hoursElapsed,
    maxHours: config.maxHours,
    label: config.label,
    percentUsed: Math.min(100, (hoursElapsed / config.maxHours) * 100),
  };
}

/**
 * Check if an entity is overdue based on its stage and stage_entered_at.
 */
export function isOverdue(
  stage: string,
  stageEnteredAt: string | Date | null,
  slaConfigs: SLAConfig[]
): boolean {
  const status = calculateSLAStatus(stage, stageEnteredAt, slaConfigs);
  return status?.isOverdue ?? false;
}
