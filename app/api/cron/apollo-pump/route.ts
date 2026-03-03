import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  searchPeople,
  MDM_APOLLO_CONFIG,
  mapApolloToLead,
  mapApolloToContact,
} from '@/lib/integrations/apollo';

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SIGNING_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let totalImported = 0;
  let totalDupes = 0;

  try {
    for (let page = 1; page <= MDM_APOLLO_CONFIG.maxPagesPerRun; page++) {
      const people = await searchPeople({
        person_titles: MDM_APOLLO_CONFIG.titles,
        organization_locations: MDM_APOLLO_CONFIG.locations,
        organization_num_employees_ranges: MDM_APOLLO_CONFIG.employeeRanges,
        per_page: MDM_APOLLO_CONFIG.perPage,
        page,
      });

      if (people.length === 0) break;

      for (const person of people) {
        const leadData = mapApolloToLead(person);

        // Dedup check by Apollo person ID (stored as external_id)
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('external_id', person.id)
          .limit(1);

        if (existing && existing.length > 0) {
          totalDupes++;
          continue;
        }

        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .insert({ ...leadData, external_id: person.id })
          .select('id')
          .single();

        if (leadError) {
          console.error('Apollo lead insert error:', leadError.message);
          continue;
        }

        const { error: contactError } = await supabase
          .from('contacts')
          .insert(mapApolloToContact(person, lead.id));

        if (contactError) {
          console.error('Apollo contact insert error:', contactError.message);
        }

        totalImported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported: totalImported,
      duplicates: totalDupes,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Apollo pump error:', err);
    return NextResponse.json(
      { error: 'Apollo pump failed', details: String(err) },
      { status: 500 },
    );
  }
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
