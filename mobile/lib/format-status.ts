/**
 * Converts underscore-separated status strings to human-readable labels.
 * e.g. "on_hold" → "on hold", "in_progress" → "in progress"
 */
export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}
