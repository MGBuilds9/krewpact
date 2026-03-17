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
  portals: false,
  executive: false,
  bidding: false,
  enrichment_ui: false,
  ai_suggestions: true,
  ai_insights: true,
  ai_daily_digest: true,
  sequences: false,
  migration_tool: false,
  schedule: false,
  documents_upload: false,
  finance: false,
  safety: false,
  closeout: false,
  warranty: false,
} as const;

export type FeatureKey = keyof typeof features;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return features[key];
}
