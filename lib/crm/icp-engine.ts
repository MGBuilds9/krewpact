/**
 * ICP (Ideal Client Profile) Generation Engine
 *
 * Analyzes historical account data to generate data-driven ICPs.
 * Also scores leads against ICPs to surface best-fit prospects.
 */

export interface AccountForICP {
  id: string;
  division_id: string | null;
  industry: string | null;
  address: Record<string, string> | null;
  total_projects: number;
  lifetime_revenue: number;
  is_repeat_client: boolean;
  source: string | null;
  tags: string[];
}

export interface LeadForICP {
  id: string;
  industry: string | null;
  city: string | null;
  province: string | null;
  source_channel: string | null;
  /** Estimated project value — pulled from enrichment_data or a top-level field */
  estimated_value?: number | null;
}

export interface ICPProfile {
  name: string;
  description: string;
  division_id: string | null;
  is_auto_generated: boolean;
  industry_match: string[];
  geography_match: { cities: string[]; provinces: string[] };
  project_value_range: { min: number; max: number };
  project_types: string[];
  repeat_rate_weight: number;
  sample_size: number;
  confidence_score: number;
  avg_deal_value: number;
  avg_project_duration_days: number;
  top_sources: string[];
}

/**
 * Count occurrences of each value in an array and return the top-N most common.
 */
function topN<T extends string>(items: T[], n: number): T[] {
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value]) => value);
}

/**
 * Generate ICPs from a set of accounts.
 *
 * Algorithm:
 * 1. Group accounts by division_id first, then by industry within each division
 * 2. Each group with ≥ 3 accounts becomes an ICP
 * 3. Compute aggregate stats per group
 * 4. Division-specific ICPs get their division_id set for per-division profile tuning
 */
export function generateICPsFromAccounts(accounts: AccountForICP[]): ICPProfile[] {
  // Group by division_id → industry (composite key)
  const groups = new Map<string, AccountForICP[]>();
  for (const account of accounts) {
    if (!account.industry) continue;
    const industry = account.industry.trim();
    if (!industry) continue;
    // Use division_id as prefix for grouping; null divisions get grouped together
    const divisionKey = account.division_id ?? '__no_division__';
    const groupKey = `${divisionKey}::${industry}`;
    const existing = groups.get(groupKey) ?? [];
    existing.push(account);
    groups.set(groupKey, existing);
  }

  const profiles: ICPProfile[] = [];

  for (const [groupKey, group] of groups) {
    if (group.length < 3) continue;

    const [divisionKey, industry] = groupKey.split('::');
    const divisionId = divisionKey === '__no_division__' ? null : divisionKey;
    const sampleSize = group.length;

    // Avg deal value: lifetime_revenue / total_projects (guard against div-by-zero)
    const avgDealValues = group
      .filter((a) => a.total_projects > 0)
      .map((a) => a.lifetime_revenue / a.total_projects);
    const avgDealValue =
      avgDealValues.length > 0
        ? avgDealValues.reduce((sum, v) => sum + v, 0) / avgDealValues.length
        : 0;

    // Project value range (min/max of avg deal values)
    const minValue = avgDealValues.length > 0 ? Math.min(...avgDealValues) : 0;
    const maxValue = avgDealValues.length > 0 ? Math.max(...avgDealValues) : 0;

    // Geography: extract cities and provinces from address JSONB
    const cities: string[] = [];
    const provinces: string[] = [];
    for (const account of group) {
      if (!account.address) continue;
      const city = account.address['city'] ?? account.address['City'];
      const province =
        account.address['province'] ??
        account.address['Province'] ??
        account.address['state'] ??
        account.address['State'];
      if (city && typeof city === 'string') cities.push(city.trim());
      if (province && typeof province === 'string') provinces.push(province.trim());
    }
    const topCities = topN(cities, 5);
    const topProvinces = topN(provinces, 3);

    // Repeat rate: % of accounts with is_repeat_client = true
    const repeatCount = group.filter((a) => a.is_repeat_client).length;
    const repeatRate = repeatCount / sampleSize;

    // Top sources
    const sources = group.map((a) => a.source).filter((s): s is string => !!s);
    const topSources = topN(sources, 3);

    // Confidence = min(100, sample_size * 10)
    const confidenceScore = Math.min(100, sampleSize * 10);

    profiles.push({
      name: `${industry} Client Profile`,
      description: `Auto-generated ICP based on ${sampleSize} ${industry} accounts. Avg deal value: $${Math.round(avgDealValue).toLocaleString()}.`,
      division_id: divisionId,
      is_auto_generated: true,
      industry_match: [industry],
      geography_match: { cities: topCities, provinces: topProvinces },
      project_value_range: { min: Math.round(minValue), max: Math.round(maxValue) },
      project_types: [],
      repeat_rate_weight: Math.round(repeatRate * 100) / 100,
      sample_size: sampleSize,
      confidence_score: confidenceScore,
      avg_deal_value: Math.round(avgDealValue),
      avg_project_duration_days: 0,
      top_sources: topSources,
    });
  }

  // Sort by confidence score descending
  profiles.sort((a, b) => b.confidence_score - a.confidence_score);

  return profiles;
}

/**
 * Score a lead against a single ICP. Returns 0-100 score.
 *
 * Dimensions:
 * - Industry match: 25 pts
 * - Geography match: 20 pts
 * - Value range match: 20 pts
 * - Repeat rate bonus: 0-25 pts (weighted by icp.repeat_rate_weight)
 * - Source match: 10 pts
 */
export function scoreLeadAgainstICP(
  lead: LeadForICP,
  icp: ICPProfile,
): { score: number; details: Record<string, number> } {
  const details: Record<string, number> = {
    industry: 0,
    geography: 0,
    value_range: 0,
    repeat_rate: 0,
    source: 0,
  };

  // Industry match: 25 pts
  if (lead.industry) {
    const leadIndustry = lead.industry.toLowerCase().trim();
    const matched = icp.industry_match.some((i) => i.toLowerCase().trim() === leadIndustry);
    if (matched) details['industry'] = 25;
  }

  // Geography match: 20 pts (city OR province)
  if (lead.city || lead.province) {
    const cityMatch =
      lead.city &&
      icp.geography_match.cities.some(
        (c) => c.toLowerCase().trim() === lead.city!.toLowerCase().trim(),
      );
    const provinceMatch =
      lead.province &&
      icp.geography_match.provinces.some(
        (p) => p.toLowerCase().trim() === lead.province!.toLowerCase().trim(),
      );
    if (cityMatch || provinceMatch) details['geography'] = 20;
  }

  // Value range match: 20 pts
  if (lead.estimated_value != null && icp.project_value_range.max > 0) {
    const { min, max } = icp.project_value_range;
    if (lead.estimated_value >= min && lead.estimated_value <= max) {
      details['value_range'] = 20;
    }
  }

  // Repeat rate bonus: 25 * repeat_rate_weight
  details['repeat_rate'] = Math.round(25 * icp.repeat_rate_weight);

  // Source match: 10 pts
  if (lead.source_channel) {
    const leadSource = lead.source_channel.toLowerCase().trim();
    const matched = icp.top_sources.some((s) => s.toLowerCase().trim() === leadSource);
    if (matched) details['source'] = 10;
  }

  const score = Math.min(
    100,
    Object.values(details).reduce((sum, v) => sum + v, 0),
  );

  return { score, details };
}
