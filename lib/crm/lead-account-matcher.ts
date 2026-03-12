/**
 * Lead-to-Account matching engine.
 *
 * Matches a lead against existing accounts using multiple strategies
 * in priority order: exact email → exact phone → exact domain → fuzzy name.
 */

import {
  trigramSimilarity,
  normalizePhone,
  normalizeEmail,
  extractDomain,
} from './duplicate-detector';

export interface LeadAccountMatchResult {
  account_id: string;
  account_name: string;
  match_type: 'exact_email' | 'exact_phone' | 'exact_domain' | 'fuzzy_name';
  match_score: number; // 0-1
  total_projects: number;
  last_project_date: string | null;
  lifetime_revenue: number;
}

interface LeadInput {
  company_name: string;
  email?: string | null;
  phone?: string | null;
  domain?: string | null;
  city?: string | null;
}

interface AccountInput {
  id: string;
  account_name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: Record<string, string> | null;
  total_projects: number;
  last_project_date: string | null;
  lifetime_revenue: number;
}

const DEFAULT_THRESHOLD = 0.5;

/**
 * Match a lead against a list of accounts using multiple strategies.
 * Returns matches above the threshold, sorted by match_score descending.
 */
export function matchLeadToAccounts(
  lead: LeadInput,
  accounts: AccountInput[],
  threshold: number = DEFAULT_THRESHOLD,
): LeadAccountMatchResult[] {
  const results: LeadAccountMatchResult[] = [];

  // Precompute normalized lead values once
  const leadEmail = lead.email ? normalizeEmail(lead.email) : null;
  const leadPhone = lead.phone ? normalizePhone(lead.phone) : null;
  const leadDomain = lead.domain
    ? extractDomain(lead.domain)
    : lead.email
      ? extractDomain(`http://${lead.email.split('@')[1] ?? ''}`)
      : null;
  const leadCity = lead.city?.toLowerCase().trim() ?? null;

  // Track best match per account (highest score wins)
  const bestMatchPerAccount = new Map<
    string,
    { match_type: LeadAccountMatchResult['match_type']; match_score: number }
  >();

  for (const account of accounts) {
    let bestType: LeadAccountMatchResult['match_type'] | null = null;
    let bestScore = 0;

    // Strategy 1: Exact email match → score 1.0
    if (leadEmail && account.email) {
      const accountEmail = normalizeEmail(account.email);
      if (leadEmail === accountEmail) {
        bestType = 'exact_email';
        bestScore = 1.0;
      }
    }

    // Strategy 2: Exact phone match (normalized) → score 0.95
    if (bestScore < 0.95 && leadPhone && account.phone) {
      const accountPhone = normalizePhone(account.phone);
      if (leadPhone === accountPhone && leadPhone.length >= 7) {
        bestType = 'exact_phone';
        bestScore = 0.95;
      }
    }

    // Strategy 3: Exact domain match → score 0.9
    if (bestScore < 0.9 && leadDomain) {
      const accountDomain = account.website ? extractDomain(account.website) : null;
      if (accountDomain && leadDomain && leadDomain === accountDomain && leadDomain.length > 0) {
        bestType = 'exact_domain';
        bestScore = 0.9;
      }
    }

    // Strategy 4: Fuzzy name match (trigram ≥ 0.6)
    if (bestScore < 0.6) {
      const nameSimilarity = trigramSimilarity(lead.company_name, account.account_name);
      if (nameSimilarity >= 0.6) {
        // City boost: same city → score 0.8, no city match → score 0.6
        const accountCity =
          account.address?.city?.toLowerCase().trim() ??
          account.address?.locality?.toLowerCase().trim() ??
          null;
        const sameCity = leadCity && accountCity && leadCity === accountCity;
        const score = sameCity ? 0.8 : 0.6;

        if (score > bestScore) {
          bestType = 'fuzzy_name';
          bestScore = score;
        }
      }
    }

    if (bestType !== null && bestScore >= threshold) {
      bestMatchPerAccount.set(account.id, { match_type: bestType, match_score: bestScore });
    }
  }

  // Build results list
  for (const [accountId, match] of bestMatchPerAccount) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) continue;

    results.push({
      account_id: account.id,
      account_name: account.account_name,
      match_type: match.match_type,
      match_score: match.match_score,
      total_projects: account.total_projects,
      last_project_date: account.last_project_date,
      lifetime_revenue: account.lifetime_revenue,
    });
  }

  // Sort by match_score descending
  results.sort((a, b) => b.match_score - a.match_score);

  return results;
}
