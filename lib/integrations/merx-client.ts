import { createHash } from 'crypto';

import { logger } from '@/lib/logger';

export interface MerxTender {
  tender_number: string;
  title: string;
  description: string | null;
  organization: string | null;
  closing_date: string | null;
  location: string | null;
  category: string | null;
  source_url: string | null;
  estimated_value: number | null;
}

export interface MerxSyncResult {
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

interface MerxApiTender {
  tenderNumber: string;
  title: string;
  description?: string;
  buyerName?: string;
  closingDate?: string;
  location?: string;
  category?: string;
  url?: string;
  estimatedValue?: number;
}

interface MerxApiResponse {
  tenders: MerxApiTender[];
  nextPage?: string | null;
}

function generateDedupHash(tenderNumber: string, closingDate: string | null): string {
  const input = `${tenderNumber}:${closingDate ?? 'no-date'}`;
  return `merx:${createHash('sha256').update(input).digest('hex').slice(0, 16)}`;
}

function mapApiTender(raw: MerxApiTender): MerxTender {
  return {
    tender_number: raw.tenderNumber,
    title: raw.title,
    description: raw.description ?? null,
    organization: raw.buyerName ?? null,
    closing_date: raw.closingDate ?? null,
    location: raw.location ?? null,
    category: raw.category ?? null,
    source_url: raw.url ?? null,
    estimated_value: raw.estimatedValue ?? null,
  };
}

async function fetchPage(
  apiUrl: string,
  apiKey: string,
  pageUrl: string,
): Promise<MerxApiResponse> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const url = new URL(pageUrl, apiUrl);
  url.searchParams.set('province', 'ON');
  url.searchParams.set('category', 'construction');
  url.searchParams.set('postedFrom', sevenDaysAgo);

  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      return res.json() as Promise<MerxApiResponse>;
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === maxAttempts - 1) {
      throw new Error(`MERX API error: ${res.status} ${res.statusText}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
  }

  throw new Error('MERX API: exhausted retries');
}

/**
 * Fetches new tenders from MERX.
 * Uses MERX_API_URL and MERX_API_KEY from environment.
 * Falls back to empty list if no API configured.
 */
export async function fetchMerxTenders(): Promise<MerxTender[]> {
  const apiUrl = process.env.MERX_API_URL;
  const apiKey = process.env.MERX_API_KEY;

  if (!apiUrl || !apiKey) {
    logger.warn('MERX API not configured — returning empty tender list');
    return [];
  }

  const tenders: MerxTender[] = [];
  let nextPage: string | null | undefined = '/tenders';
  let pages = 0;
  const maxPages = 10;

  while (nextPage && pages < maxPages) {
    const data = await fetchPage(apiUrl, apiKey, nextPage);
    for (const raw of data.tenders ?? []) {
      tenders.push(mapApiTender(raw));
    }
    nextPage = data.nextPage;
    pages++;
  }

  logger.info('MERX tenders fetched', { count: tenders.length, pages });
  return tenders;
}

/**
 * Maps a MERX tender to the bidding_opportunities table schema.
 */
export function toBiddingOpportunity(tender: MerxTender, orgId: string) {
  return {
    org_id: orgId,
    title: tender.title,
    description: tender.description,
    source: 'merx' as const,
    source_reference: tender.tender_number,
    owner_organization: tender.organization,
    closing_date: tender.closing_date,
    location: tender.location,
    category: tender.category,
    source_url: tender.source_url,
    estimated_value: tender.estimated_value,
    status: 'new',
    dedup_hash: generateDedupHash(tender.tender_number, tender.closing_date),
  };
}

export { generateDedupHash };
