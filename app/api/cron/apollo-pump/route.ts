import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  searchPeople,
  mapApolloToLead,
  mapApolloToContact,
} from '@/lib/integrations/apollo';
import {
  getProfileById,
  getProfilesForWeek,
  getWeekNumber,
} from '@/lib/integrations/apollo-profiles';
import type { ApolloSearchProfile } from '@/lib/integrations/apollo-profiles';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';

interface ProfileRunResult {
  profileId: string;
  divisionCode: string;
  leadsFound: number;
  leadsImported: number;
  duplicatesSkipped: number;
  pageStart: number;
  pageEnd: number;
}

/**
 * Load or initialize the pagination watermark for a profile.
 */
async function getProfileState(
  supabase: ReturnType<typeof createServiceClient>,
  profileId: string,
): Promise<{ lastPage: number; creditsUsedThisMonth: number }> {
  const { data } = await supabase
    .from('apollo_pump_state')
    .select('last_page, credits_used_this_month, month_reset_at')
    .eq('profile_id', profileId)
    .single();

  if (!data) return { lastPage: 0, creditsUsedThisMonth: 0 };

  // Reset monthly credits if we're in a new month
  const monthReset = new Date(data.month_reset_at);
  const now = new Date();
  if (now.getMonth() !== monthReset.getMonth() || now.getFullYear() !== monthReset.getFullYear()) {
    return { lastPage: data.last_page, creditsUsedThisMonth: 0 };
  }

  return { lastPage: data.last_page, creditsUsedThisMonth: data.credits_used_this_month };
}

/**
 * Update the pagination watermark and credit tracking after a profile run.
 */
async function updateProfileState(
  supabase: ReturnType<typeof createServiceClient>,
  profileId: string,
  divisionCode: string,
  lastPage: number,
  imported: number,
  resetPage: boolean,
): Promise<void> {
  const now = new Date().toISOString();
  const pageToStore = resetPage ? 0 : lastPage;

  const { error } = await supabase
    .from('apollo_pump_state')
    .upsert(
      {
        profile_id: profileId,
        division_code: divisionCode,
        last_page: pageToStore,
        last_run_at: now,
        total_imported: imported, // Will be incremented by trigger or next read
        credits_used_this_month: imported, // Approximate: 1 credit per imported lead
        month_reset_at: now,
        updated_at: now,
      },
      { onConflict: 'profile_id' },
    );

  if (error) {
    logger.error('Failed to update apollo_pump_state', { profileId, error: error.message });
  }
}

/**
 * Record a profile run for performance analytics.
 */
async function recordProfileRun(
  supabase: ReturnType<typeof createServiceClient>,
  result: ProfileRunResult,
): Promise<void> {
  const { error } = await supabase.from('apollo_profile_runs').insert({
    profile_id: result.profileId,
    division_code: result.divisionCode,
    leads_found: result.leadsFound,
    leads_imported: result.leadsImported,
    duplicates_skipped: result.duplicatesSkipped,
    page_start: result.pageStart,
    page_end: result.pageEnd,
  });

  if (error) {
    logger.error('Failed to record apollo_profile_run', { profileId: result.profileId, error: error.message });
  }
}

/**
 * Execute a single profile search: paginate from watermark, dedup, insert leads + contacts.
 */
async function runProfile(
  supabase: ReturnType<typeof createServiceClient>,
  profile: ApolloSearchProfile,
): Promise<ProfileRunResult> {
  const { lastPage } = await getProfileState(supabase, profile.id);
  const startPage = lastPage + 1;
  const maxPages = Math.ceil(profile.batchSize / (profile.searchParams.per_page ?? 25));

  let totalFound = 0;
  let totalImported = 0;
  let totalDupes = 0;
  let currentPage = startPage;
  let reachedEnd = false;

  for (let i = 0; i < maxPages; i++) {
    const people = await searchPeople({
      ...profile.searchParams,
      per_page: profile.searchParams.per_page ?? 25,
      page: currentPage,
    });

    if (people.length === 0) {
      reachedEnd = true;
      break;
    }

    totalFound += people.length;

    // Batch dedup
    const externalIds = people.map((p) => p.id);
    const { data: existing } = await supabase
      .from('leads')
      .select('external_id')
      .in('external_id', externalIds);
    const existingIds = new Set((existing ?? []).map((e) => e.external_id));
    const newPeople = people.filter((p) => !existingIds.has(p.id));
    totalDupes += people.length - newPeople.length;

    if (newPeople.length > 0) {
      const leadsToInsert = newPeople.map((p) => ({
        ...mapApolloToLead(p),
        external_id: p.id,
        source_detail: profile.id,
      }));

      const { data: insertedLeads, error: leadError } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select('id, external_id');

      if (leadError) {
        logger.error('Apollo bulk lead insert error', { profile: profile.id, error: leadError.message });
      } else if (insertedLeads) {
        const leadIdMap = new Map(insertedLeads.map((l) => [l.external_id, l.id]));
        const contactsToInsert = newPeople
          .filter((p) => leadIdMap.has(p.id))
          .map((p) => mapApolloToContact(p, leadIdMap.get(p.id)!));

        if (contactsToInsert.length > 0) {
          const { error: contactError } = await supabase
            .from('contacts')
            .insert(contactsToInsert);
          if (contactError) {
            logger.error('Apollo bulk contact insert error', { profile: profile.id, error: contactError.message });
          }
        }
        totalImported += insertedLeads.length;
      }
    }

    currentPage++;
  }

  // Update watermark — reset to 0 if we reached the end of results
  await updateProfileState(supabase, profile.id, profile.divisionCode, currentPage - 1, totalImported, reachedEnd);

  const result: ProfileRunResult = {
    profileId: profile.id,
    divisionCode: profile.divisionCode,
    leadsFound: totalFound,
    leadsImported: totalImported,
    duplicatesSkipped: totalDupes,
    pageStart: startPage,
    pageEnd: currentPage - 1,
  };

  // Record the run for analytics
  await recordProfileRun(supabase, result);

  return result;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Check for single-profile override (manual trigger or testing)
  const profileId = req.nextUrl.searchParams.get('profileId');

  if (profileId) {
    const profile = getProfileById(profileId);
    if (!profile) {
      return NextResponse.json({ error: `Profile not found: ${profileId}` }, { status: 400 });
    }

    try {
      const result = await runProfile(supabase, profile);
      return NextResponse.json({
        success: true,
        mode: 'single-profile',
        profiles: [result],
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('Apollo pump error (single profile)', { profileId, error: err });
      return NextResponse.json(
        { error: 'Apollo pump failed', details: String(err) },
        { status: 500 },
      );
    }
  }

  // Auto-rotation mode: select profiles for this week
  const weekNumber = getWeekNumber();
  const profiles = getProfilesForWeek(weekNumber);

  if (profiles.length === 0) {
    return NextResponse.json({
      success: true,
      mode: 'auto-rotation',
      message: 'No profiles scheduled for this week',
      weekNumber,
      timestamp: new Date().toISOString(),
    });
  }

  const results: ProfileRunResult[] = [];
  const errors: { profileId: string; error: string }[] = [];

  for (const profile of profiles) {
    try {
      const result = await runProfile(supabase, profile);
      results.push(result);
    } catch (err) {
      logger.error('Apollo pump error', { profileId: profile.id, error: err });
      errors.push({ profileId: profile.id, error: String(err) });
    }
  }

  const totalImported = results.reduce((sum, r) => sum + r.leadsImported, 0);
  const totalDuplicates = results.reduce((sum, r) => sum + r.duplicatesSkipped, 0);

  return NextResponse.json({
    success: errors.length === 0,
    mode: 'auto-rotation',
    weekNumber,
    profilesRun: results.length,
    profilesFailed: errors.length,
    totalImported,
    totalDuplicates,
    profiles: results,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
