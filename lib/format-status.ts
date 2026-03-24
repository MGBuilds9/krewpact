/**
 * Humanize a database enum/status value for display.
 * "in_progress" → "In Progress", "awaiting_signature" → "Awaiting Signature"
 */
export function formatStatus(status: string | null | undefined): string {
  if (!status) return '\u2014';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
