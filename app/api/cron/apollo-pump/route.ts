import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  searchPeople,
  MDM_APOLLO_CONFIG,
  mapApolloToLead,
  mapApolloToContact,
} from '@/lib/integrations/apollo';
import { getProfileById } from '@/lib/integrations/apollo-profiles';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let totalImported = 0;
  let totalDupes = 0;

  // Check for profile-based search
  const profileId = req.nextUrl.searchParams.get('profileId');
  const profile = profileId ? getProfileById(profileId) : null;

  if (profileId && !profile) {
    return NextResponse.json({ error: `Profile not found: ${profileId}` }, { status: 400 });
  }

  const searchConfig = profile
    ? {
        titles: profile.searchParams.person_titles ?? MDM_APOLLO_CONFIG.titles,
        locations: profile.searchParams.organization_locations ?? MDM_APOLLO_CONFIG.locations,
        employeeRanges:
          profile.searchParams.organization_num_employees_ranges ??
          MDM_APOLLO_CONFIG.employeeRanges,
        industryTagIds: profile.searchParams.organization_industry_tag_ids,
        perPage: MDM_APOLLO_CONFIG.perPage,
        maxPagesPerRun: MDM_APOLLO_CONFIG.maxPagesPerRun,
        sourceDetail: profile.id,
      }
    : {
        titles: MDM_APOLLO_CONFIG.titles,
        locations: MDM_APOLLO_CONFIG.locations,
        employeeRanges: MDM_APOLLO_CONFIG.employeeRanges,
        industryTagIds: undefined as string[] | undefined,
        perPage: MDM_APOLLO_CONFIG.perPage,
        maxPagesPerRun: MDM_APOLLO_CONFIG.maxPagesPerRun,
        sourceDetail: undefined as string | undefined,
      };

  try {
    for (let page = 1; page <= searchConfig.maxPagesPerRun; page++) {
      const people = await searchPeople({
        person_titles: searchConfig.titles,
        organization_locations: searchConfig.locations,
        organization_num_employees_ranges: searchConfig.employeeRanges,
        organization_industry_tag_ids: searchConfig.industryTagIds,
        per_page: searchConfig.perPage,
        page,
      });

      if (people.length === 0) break;

      // Batch dedup: single query for all external IDs in this page
      const externalIds = people.map((p) => p.id);
      const { data: existing } = await supabase
        .from('leads')
        .select('external_id')
        .in('external_id', externalIds);
      const existingIds = new Set((existing ?? []).map((e) => e.external_id));

      const newPeople = people.filter((p) => !existingIds.has(p.id));
      totalDupes += people.length - newPeople.length;

      if (newPeople.length > 0) {
        // Batch insert all new leads in a single call
        const leadsToInsert = newPeople.map((p) => ({
          ...mapApolloToLead(p),
          external_id: p.id,
          ...(searchConfig.sourceDetail ? { source_detail: searchConfig.sourceDetail } : {}),
        }));
        const { data: insertedLeads, error: leadError } = await supabase
          .from('leads')
          .insert(leadsToInsert)
          .select('id, external_id');

        if (leadError) {
          logger.error('Apollo bulk lead insert error', { error: leadError.message });
        } else if (insertedLeads) {
          // Batch insert all contacts in a single call
          const leadIdMap = new Map(insertedLeads.map((l) => [l.external_id, l.id]));
          const contactsToInsert = newPeople
            .filter((p) => leadIdMap.has(p.id))
            .map((p) => mapApolloToContact(p, leadIdMap.get(p.id)!));

          if (contactsToInsert.length > 0) {
            const { error: contactError } = await supabase
              .from('contacts')
              .insert(contactsToInsert);
            if (contactError) {
              logger.error('Apollo bulk contact insert error', { error: contactError.message });
            }
          }
          totalImported += insertedLeads.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: totalImported,
      duplicates: totalDupes,
      profileId: profileId ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Apollo pump error', { error: err });
    return NextResponse.json(
      { error: 'Apollo pump failed', details: String(err) },
      { status: 500 },
    );
  }
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
