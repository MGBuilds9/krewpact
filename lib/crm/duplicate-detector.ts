/**
 * Duplicate detection engine for CRM entities.
 *
 * Uses fuzzy string matching (trigram similarity) to find potential duplicates
 * before creation, and provides merge logic to consolidate records.
 */

// =====================================================
// Similarity scoring (trigram-based, mirrors pg_trgm)
// =====================================================

/**
 * Calculate trigram similarity between two strings.
 * This is a TypeScript approximation of PostgreSQL's pg_trgm similarity().
 */
export function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const normalizedA = a.toLowerCase().trim();
  const normalizedB = b.toLowerCase().trim();

  if (normalizedA === normalizedB) return 1;

  const trigramsA = getTrigrams(normalizedA);
  const trigramsB = getTrigrams(normalizedB);

  if (trigramsA.size === 0 && trigramsB.size === 0) return 1;
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const trigram of trigramsA) {
    if (trigramsB.has(trigram)) intersection++;
  }

  const union = trigramsA.size + trigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getTrigrams(str: string): Set<string> {
  const padded = `  ${str} `;
  const trigrams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.substring(i, i + 3));
  }
  return trigrams;
}

// =====================================================
// Normalization helpers
// =====================================================

/**
 * Normalize phone number to digits only for comparison.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Normalize email for comparison.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Compute domain hash (matches the DB's MD5(LOWER(COALESCE(domain, ''))))
 * For client-side preview — actual dedup uses DB-computed domain_hash.
 */
export function extractDomain(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const domain = url
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
    return domain;
  } catch {
    return '';
  }
}

// =====================================================
// Duplicate match types
// =====================================================

export interface DuplicateMatch {
  id: string;
  matchType: 'exact_email' | 'exact_phone' | 'exact_domain' | 'fuzzy_name';
  similarity: number;
  matchedField: string;
  matchedValue: string;
  entity: Record<string, unknown>;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
}

// =====================================================
// Lead duplicate detection
// =====================================================

export interface LeadCandidate {
  company_name: string;
  domain?: string | null;
  email?: string | null;
  city?: string | null;
}

export function findLeadDuplicates(
  candidate: LeadCandidate,
  existingLeads: Array<Record<string, unknown>>,
  threshold = 0.6,
): DuplicateCheckResult {
  const matches: DuplicateMatch[] = [];

  for (const lead of existingLeads) {
    const leadId = lead.id as string;

    // 1. Exact domain match
    if (candidate.domain && lead.domain) {
      const candidateDomain = extractDomain(candidate.domain);
      const existingDomain = extractDomain(lead.domain as string);
      if (candidateDomain && existingDomain && candidateDomain === existingDomain) {
        matches.push({
          id: leadId,
          matchType: 'exact_domain',
          similarity: 1.0,
          matchedField: 'domain',
          matchedValue: existingDomain,
          entity: lead,
        });
        continue; // Don't add fuzzy match for same lead
      }
    }

    // 2. Fuzzy company_name match
    if (candidate.company_name && lead.company_name) {
      const similarity = trigramSimilarity(candidate.company_name, lead.company_name as string);
      if (similarity >= threshold) {
        matches.push({
          id: leadId,
          matchType: 'fuzzy_name',
          similarity,
          matchedField: 'company_name',
          matchedValue: lead.company_name as string,
          entity: lead,
        });
      }
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  return {
    hasDuplicates: matches.length > 0,
    matches,
  };
}

// =====================================================
// Contact duplicate detection
// =====================================================

export interface ContactCandidate {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
}

export function findContactDuplicates(
  candidate: ContactCandidate,
  existingContacts: Array<Record<string, unknown>>,
  threshold = 0.6,
): DuplicateCheckResult {
  const matches: DuplicateMatch[] = [];

  for (const contact of existingContacts) {
    const contactId = contact.id as string;

    // 1. Exact email match
    if (candidate.email && contact.email) {
      if (normalizeEmail(candidate.email) === normalizeEmail(contact.email as string)) {
        matches.push({
          id: contactId,
          matchType: 'exact_email',
          similarity: 1.0,
          matchedField: 'email',
          matchedValue: contact.email as string,
          entity: contact,
        });
        continue;
      }
    }

    // 2. Exact phone match (normalized)
    if (candidate.phone && contact.phone) {
      if (normalizePhone(candidate.phone) === normalizePhone(contact.phone as string)) {
        matches.push({
          id: contactId,
          matchType: 'exact_phone',
          similarity: 1.0,
          matchedField: 'phone',
          matchedValue: contact.phone as string,
          entity: contact,
        });
        continue;
      }
    }

    // 3. Fuzzy name match
    const candidateFullName = `${candidate.first_name} ${candidate.last_name}`;
    const existingFullName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim();
    if (existingFullName) {
      const similarity = trigramSimilarity(candidateFullName, existingFullName);
      if (similarity >= threshold) {
        matches.push({
          id: contactId,
          matchType: 'fuzzy_name',
          similarity,
          matchedField: 'name',
          matchedValue: existingFullName,
          entity: contact,
        });
      }
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);

  return {
    hasDuplicates: matches.length > 0,
    matches,
  };
}

// =====================================================
// Account duplicate detection
// =====================================================

export interface AccountCandidate {
  account_name: string;
}

export function findAccountDuplicates(
  candidate: AccountCandidate,
  existingAccounts: Array<Record<string, unknown>>,
  threshold = 0.6,
): DuplicateCheckResult {
  const matches: DuplicateMatch[] = [];

  for (const account of existingAccounts) {
    if (account.account_name) {
      const similarity = trigramSimilarity(candidate.account_name, account.account_name as string);
      if (similarity >= threshold) {
        matches.push({
          id: account.id as string,
          matchType: 'fuzzy_name',
          similarity,
          matchedField: 'account_name',
          matchedValue: account.account_name as string,
          entity: account,
        });
      }
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);

  return {
    hasDuplicates: matches.length > 0,
    matches,
  };
}

// =====================================================
// Lead merge logic
// =====================================================

export interface MergeResult {
  primaryId: string;
  secondaryId: string;
  mergedFields: string[];
  reassignedRelations: string[];
}

/**
 * Determine which fields from the secondary lead should fill gaps in the primary.
 * Returns a partial update object for the primary lead.
 */
export function computeLeadMerge(
  primary: Record<string, unknown>,
  secondary: Record<string, unknown>,
): { updates: Record<string, unknown>; mergedFields: string[] } {
  const fillableFields = [
    'domain',
    'industry',
    'source_channel',
    'source_detail',
    'project_type',
    'project_description',
    'estimated_value',
    'estimated_sqft',
    'timeline_urgency',
    'address',
    'city',
    'province',
    'postal_code',
    'notes',
  ];

  const updates: Record<string, unknown> = {};
  const mergedFields: string[] = [];

  for (const field of fillableFields) {
    // Fill gaps: if primary is empty but secondary has data
    if (
      (primary[field] === null || primary[field] === undefined || primary[field] === '') &&
      secondary[field] !== null &&
      secondary[field] !== undefined &&
      secondary[field] !== ''
    ) {
      updates[field] = secondary[field];
      mergedFields.push(field);
    }
  }

  // Merge notes by appending
  if (primary.notes && secondary.notes) {
    updates.notes = `${primary.notes}\n\n--- Merged from duplicate ---\n${secondary.notes}`;
    if (!mergedFields.includes('notes')) mergedFields.push('notes');
  }

  // Keep higher score
  const primaryScore = (primary.lead_score as number) ?? 0;
  const secondaryScore = (secondary.lead_score as number) ?? 0;
  if (secondaryScore > primaryScore) {
    updates.lead_score = secondaryScore;
    mergedFields.push('lead_score');
  }

  return { updates, mergedFields };
}
