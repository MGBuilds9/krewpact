/**
 * Feature flags for KrewPact.
 *
 * Single-tenant app — no external service needed.
 * Set a flag to `true` only after the feature is:
 *   1. Code complete
 *   2. Tested with real data
 *   3. UX reviewed
 */
export const features = {
  portals: true,
  executive: true,
  bidding: true,
  enrichment_ui: true,
  ai_suggestions: true,
  ai_insights: true,
  ai_daily_digest: true,
  sequences: true,
  migration_tool: true,
  schedule: true,
  documents_upload: true,
  finance: true,
  safety: true,
  closeout: true,
  warranty: true,
  inventory_management: true,
  ai_takeoff: true,
} as const;

export type FeatureKey = keyof typeof features;

export function isFeatureEnabled(key: FeatureKey): boolean {
  // Emergency kill-switch: FEATURE_DISABLE_<FLAG_NAME_UPPERCASED>=true disables a flag
  // without requiring a code deploy. Example: FEATURE_DISABLE_AI_SUGGESTIONS=true
  const envKey = `FEATURE_DISABLE_${key.toUpperCase()}`;
  if (process.env[envKey] === 'true') return false;
  return features[key];
}
