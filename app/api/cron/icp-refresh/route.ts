/**
 * ICP Auto-Refinement Cron
 *
 * Fetches accounts, regenerates ICPs from account data, then re-scores all active leads.
 *
 * Vercel cron config (add to vercel.json):
 * { "path": "/api/cron/icp-refresh", "schedule": "0 6 * * 1" }  — Monday 6 AM UTC
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createCronLogger } from '@/lib/api/cron-logger';
import {
  generateICPsFromAccounts,
  scoreLeadAgainstICP,
  type AccountForICP,
  type LeadForICP,
  type ICPProfile,
} from '@/lib/crm/icp-engine';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cronLog = createCronLogger('icp-refresh');
  const supabase = createServiceClient();

  // --- Step 1: Fetch accounts with at least 1 project ---
  const { data: rawAccounts, error: accErr } = await supabase
    .from('accounts')
    .select('id, industry, address, total_projects, lifetime_revenue, is_repeat_client, source, tags')
    .gte('total_projects', 1)
    .is('deleted_at', null);

  if (accErr) {
    logger.error('ICP refresh: failed to fetch accounts', { error: accErr.message });
    return NextResponse.json({ error: accErr.message }, { status: 500 });
  }

  const accounts = (rawAccounts ?? []) as AccountForICP[];

  if (accounts.length === 0) {
    return NextResponse.json({
      success: true,
      icps_updated: 0,
      leads_rescored: 0,
      message: 'No accounts with projects — nothing to do',
    });
  }

  // --- Step 2: Generate ICPs from accounts ---
  const newProfiles: ICPProfile[] = generateICPsFromAccounts(accounts);

  if (newProfiles.length === 0) {
    return NextResponse.json({
      success: true,
      icps_updated: 0,
      leads_rescored: 0,
      message: 'Not enough account data to generate ICPs (need ≥3 accounts per industry)',
    });
  }

  let icpsUpdated = 0;

  // Upsert each generated ICP by name (auto-generated ICPs only)
  for (const profile of newProfiles) {
    const icpRow: Record<string, unknown> = {
      name: profile.name,
      description: profile.description,
      division_id: profile.division_id,
      is_auto_generated: true,
      is_active: true,
      industry_match: profile.industry_match,
      geography_match: profile.geography_match,
      project_value_range: profile.project_value_range,
      project_types: profile.project_types,
      repeat_rate_weight: profile.repeat_rate_weight,
      sample_size: profile.sample_size,
      confidence_score: profile.confidence_score,
      avg_deal_value: profile.avg_deal_value,
      avg_project_duration_days: profile.avg_project_duration_days,
      top_sources: profile.top_sources,
      updated_at: new Date().toISOString(),
    };

    // Check if an auto-generated ICP with this name already exists
    const { data: existing } = await supabase
      .from('ideal_client_profiles')
      .select('id')
      .eq('name', profile.name)
      .eq('is_auto_generated', true)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('ideal_client_profiles')
        .update(icpRow)
        .eq('id', (existing as Record<string, unknown>).id as string);
    } else {
      await supabase.from('ideal_client_profiles').insert(icpRow);
    }

    icpsUpdated++;
  }

  // --- Step 3: Fetch all active ICPs (including any manually created ones) ---
  const { data: activeICPs, error: icpFetchErr } = await supabase
    .from('ideal_client_profiles')
    .select(
      'id, name, industry_match, geography_match, project_value_range, project_types, repeat_rate_weight, top_sources',
    )
    .eq('is_active', true);

  if (icpFetchErr) {
    logger.error('ICP refresh: failed to fetch active ICPs', { error: icpFetchErr.message });
    return NextResponse.json({
      success: true,
      icps_updated: icpsUpdated,
      leads_rescored: 0,
      warning: 'ICP upsert succeeded but lead re-scoring skipped: ' + icpFetchErr.message,
    });
  }

  if (!activeICPs || activeICPs.length === 0) {
    return NextResponse.json({ success: true, icps_updated: icpsUpdated, leads_rescored: 0 });
  }

  // --- Step 4: Re-score all active leads against updated ICPs ---
  const { data: rawLeads, error: leadsErr } = await supabase
    .from('leads')
    .select('id, industry, city, province, source_channel, enrichment_data')
    .is('deleted_at', null)
    .not('status', 'in', '("won","lost")');

  if (leadsErr) {
    logger.error('ICP refresh: failed to fetch leads', { error: leadsErr.message });
    return NextResponse.json({
      success: true,
      icps_updated: icpsUpdated,
      leads_rescored: 0,
      warning: 'Lead re-scoring skipped: ' + leadsErr.message,
    });
  }

  const leads = (rawLeads ?? []) as Array<Record<string, unknown>>;
  let leadsRescored = 0;
  const matchRows: Array<{
    icp_id: string;
    lead_id: string;
    match_score: number;
    match_details: Record<string, number>;
  }> = [];

  for (const rawLead of leads) {
    // Extract estimated_value from enrichment_data if not a direct column
    const enrichment = rawLead.enrichment_data as Record<string, unknown> | null;
    const estimatedValue =
      (enrichment?.estimated_value as number | null) ??
      (enrichment?.project_value as number | null) ??
      null;

    const lead: LeadForICP = {
      id: rawLead.id as string,
      industry: rawLead.industry as string | null,
      city: rawLead.city as string | null,
      province: rawLead.province as string | null,
      source_channel: rawLead.source_channel as string | null,
      estimated_value: estimatedValue,
    };

    for (const icp of activeICPs) {
      const icpData = icp as Record<string, unknown>;
      const icpProfile: ICPProfile = {
        name: icpData.name as string,
        description: '',
        division_id: null,
        is_auto_generated: true,
        industry_match: (icpData.industry_match as string[]) ?? [],
        geography_match: (icpData.geography_match as { cities: string[]; provinces: string[] }) ?? {
          cities: [],
          provinces: [],
        },
        project_value_range: (icpData.project_value_range as { min: number; max: number }) ?? {
          min: 0,
          max: 0,
        },
        project_types: (icpData.project_types as string[]) ?? [],
        repeat_rate_weight: (icpData.repeat_rate_weight as number) ?? 0,
        sample_size: 0,
        confidence_score: 0,
        avg_deal_value: 0,
        avg_project_duration_days: 0,
        top_sources: (icpData.top_sources as string[]) ?? [],
      };

      const { score, details } = scoreLeadAgainstICP(lead, icpProfile);

      if (score > 0) {
        matchRows.push({
          icp_id: icpData.id as string,
          lead_id: lead.id,
          match_score: score,
          match_details: details,
        });
      }
    }

    leadsRescored++;
  }

  // Upsert match rows — delete old auto-scored matches first, then batch insert
  if (matchRows.length > 0) {
    const leadIds = leads.map((l) => l.id as string);

    // Delete existing ICP match rows for these leads (will be replaced)
    await supabase.from('icp_lead_matches').delete().in('lead_id', leadIds);

    // Batch insert new scores in chunks of 200
    const CHUNK = 200;
    for (let i = 0; i < matchRows.length; i += CHUNK) {
      const chunk = matchRows.slice(i, i + CHUNK);
      const { error: insertErr } = await supabase.from('icp_lead_matches').insert(chunk);
      if (insertErr) {
        logger.error('ICP refresh: failed to insert icp_lead_matches chunk', {
          error: insertErr.message,
        });
      }
    }
  }

  logger.info('ICP refresh complete', { icps_updated: icpsUpdated, leads_rescored: leadsRescored });

  const result = { success: true, icps_updated: icpsUpdated, leads_rescored: leadsRescored, timestamp: new Date().toISOString() };
  await cronLog.success({ icps_updated: icpsUpdated, leads_rescored: leadsRescored });
  return NextResponse.json(result);
}
