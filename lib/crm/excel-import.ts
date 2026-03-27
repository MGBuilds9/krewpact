/**
 * Excel/CSV import utility for CRM account data.
 *
 * Handles row normalization, company code → division mapping,
 * and project summary parsing for the Closed-Loop CRM import pipeline.
 */

// =====================================================
// Types
// =====================================================

export interface ImportRow {
  client_id?: string;
  company_code?: string;
  company_name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  total_projects?: number;
  project_summary?: string | null;
}

export interface ParsedProject {
  project_number: string;
  project_name: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  accounts_created: string[];
  projects_created: number;
  contacts_created: number;
}

// =====================================================
// Company code → division code mapping
// =====================================================

const COMPANY_CODE_MAP: Record<string, string> = {
  CGW: 'contracting',
  T: 'telecom',
  G: 'group-inc',
  C: 'contracting',
};

/**
 * Map an Excel company code to a KrewPact division code.
 * Unknown / blank codes default to 'contracting'.
 */
export function mapCompanyCodeToDivision(code: string | undefined | null): string {
  if (!code) return 'contracting';
  const normalized = code.trim().toUpperCase();
  return COMPANY_CODE_MAP[normalized] ?? 'contracting';
}

// =====================================================
// Project summary parser
// =====================================================

/**
 * Parse a pipe-delimited project summary string into individual project records.
 *
 * Format: "[01] Description | [02] Description | ..."
 * Also handles bare "[01] Description" without pipes.
 */
export function parseProjectSummary(summary: string): ParsedProject[] {
  if (!summary || !summary.trim()) return [];

  const projects: ParsedProject[] = [];

  // Split on pipe separators
  const parts = summary
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    // Match "[XX] Some description" pattern
    const match = part.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (match) {
      const projectNumber = match[1].trim();
      const projectName = match[2].trim() || `Project ${projectNumber}`;
      projects.push({ project_number: projectNumber, project_name: projectName });
    } else if (part) {
      // No bracket prefix — treat entire string as project name with auto-numbered key
      projects.push({
        project_number: String(projects.length + 1).padStart(2, '0'),
        project_name: part,
      });
    }
  }

  return projects;
}

// =====================================================
// Address builder
// =====================================================

/**
 * Build an address JSONB object from individual row fields.
 * Returns null if no address data is present.
 */
export function buildAddressObject(
  row: Pick<ImportRow, 'address' | 'city' | 'province' | 'postal_code'>,
): Record<string, string> | null {
  const parts: Record<string, string> = {};

  if (row.address) parts.street = row.address.trim();
  if (row.city) parts.city = row.city.trim();
  if (row.province) parts.province = row.province.trim();
  if (row.postal_code) parts.postal_code = row.postal_code.trim();

  return Object.keys(parts).length > 0 ? parts : null;
}

// =====================================================
// Contact name splitter
// =====================================================

/**
 * Split a full name string into first / last name components.
 * Single-word names go into first_name with an empty last_name.
 */
export function splitContactName(fullName: string): { first_name: string; last_name: string } {
  const trimmed = fullName.trim();
  const spaceIdx = trimmed.lastIndexOf(' ');
  if (spaceIdx === -1) {
    return { first_name: trimmed, last_name: '' };
  }
  return {
    first_name: trimmed.substring(0, spaceIdx).trim(),
    last_name: trimmed.substring(spaceIdx + 1).trim(),
  };
}
