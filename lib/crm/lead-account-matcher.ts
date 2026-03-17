/**
 * Lead-to-Account matching engine.
 *
 * Matches a lead against existing accounts using multiple strategies
 * in priority order: exact email → exact phone → exact domain → fuzzy name.
 */

import {
  extractDomain,
  normalizeEmail,
  normalizePhone,
  trigramSimilarity,
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

interface NormalizedLead {
  email: string | null;
  phone: string | null;
  domain: string | null;
  city: string | null;
  company_name: string;
}

function normalizeLead(lead: LeadInput): NormalizedLead {
  return {
    email: lead.email ? normalizeEmail(lead.email) : null,
    phone: lead.phone ? normalizePhone(lead.phone) : null,
    domain: lead.domain
      ? extractDomain(lead.domain)
      : lead.email
        ? extractDomain(`http://${lead.email.split('@')[1] ?? ''}`)
        : null,
    city: lead.city?.toLowerCase().trim() ?? null,
    company_name: lead.company_name,
  };
}

function getAccountCity(account: AccountInput): string | null {
  return (
    account.address?.city?.toLowerCase().trim() ??
    account.address?.locality?.toLowerCase().trim() ??
    null
  );
}

function fuzzyNameScore(norm: NormalizedLead, account: AccountInput): number | null {
  if (trigramSimilarity(norm.company_name, account.account_name) < 0.6) return null;
  const accountCity = getAccountCity(account);
  return norm.city && accountCity && norm.city === accountCity ? 0.8 : 0.6;
}

function scoreAccount(
  norm: NormalizedLead,
  account: AccountInput,
): { match_type: LeadAccountMatchResult['match_type'] | null; match_score: number } {
  if (norm.email && account.email && normalizeEmail(account.email) === norm.email) {
    return { match_type: 'exact_email', match_score: 1.0 };
  }
  if (norm.phone && account.phone) {
    const ap = normalizePhone(account.phone);
    if (ap === norm.phone && norm.phone.length >= 7) {
      return { match_type: 'exact_phone', match_score: 0.95 };
    }
  }
  if (norm.domain) {
    const accountDomain = account.website ? extractDomain(account.website) : null;
    if (accountDomain && norm.domain === accountDomain && norm.domain.length > 0) {
      return { match_type: 'exact_domain', match_score: 0.9 };
    }
  }
  const fuzzyScore = fuzzyNameScore(norm, account);
  if (fuzzyScore !== null) {
    return { match_type: 'fuzzy_name', match_score: fuzzyScore };
  }
  return { match_type: null, match_score: 0 };
}

/**
 * Match a lead against a list of accounts using multiple strategies.
 * Returns matches above the threshold, sorted by match_score descending.
 */
export function matchLeadToAccounts(
  lead: LeadInput,
  accounts: AccountInput[],
  threshold: number = DEFAULT_THRESHOLD,
): LeadAccountMatchResult[] {
  const norm = normalizeLead(lead);
  const bestMatchPerAccount = new Map<
    string,
    { match_type: LeadAccountMatchResult['match_type']; match_score: number }
  >();

  for (const account of accounts) {
    const { match_type: bestType, match_score: bestScore } = scoreAccount(norm, account);
    if (bestType !== null && bestScore >= threshold) {
      bestMatchPerAccount.set(account.id, { match_type: bestType, match_score: bestScore });
    }
  }

  const results: LeadAccountMatchResult[] = [];
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

  results.sort((a, b) => b.match_score - a.match_score);
  return results;
}
