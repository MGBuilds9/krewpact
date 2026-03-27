/**
 * String similarity utilities for CRM duplicate detection.
 * Trigram-based similarity approximating PostgreSQL's pg_trgm.
 */

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
