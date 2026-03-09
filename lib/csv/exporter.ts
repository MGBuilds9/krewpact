/**
 * Simple CSV exporter for bulk data export operations.
 *
 * Handles:
 * - Header row from column list
 * - Proper quoting of values containing commas, quotes, or newlines
 * - Null/undefined values as empty strings
 */

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If the value contains a comma, double quote, or newline, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of records to CSV string.
 *
 * @param data - Array of record objects
 * @param columns - Column keys to include (also used as header names)
 * @returns CSV string with header row and data rows
 */
export function exportToCSV(data: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(escapeCSVValue).join(',');
  const rows = data.map((row) => columns.map((col) => escapeCSVValue(row[col])).join(','));
  return [header, ...rows].join('\n');
}
