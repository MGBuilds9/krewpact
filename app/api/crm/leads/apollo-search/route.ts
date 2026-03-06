import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchPeople, mapApolloToLead, mapApolloToContact } from '@/lib/integrations/apollo';
import { getProfileById, getActiveProfiles } from '@/lib/integrations/apollo-profiles';

const searchSchema = z.object({
  profileId: z.string().min(1),
  page: z.number().int().positive().optional().default(1),
  import: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { profileId, page, import: shouldImport } = parsed.data;

  const profile = getProfileById(profileId);
  if (!profile) {
    return NextResponse.json({ error: `Profile not found: ${profileId}` }, { status: 404 });
  }

  try {
    const people = await searchPeople({
      ...profile.searchParams,
      per_page: 25,
      page,
    });

    if (!shouldImport) {
      return NextResponse.json({
        profile: { id: profile.id, name: profile.name, division: profile.division, vertical: profile.vertical },
        results: people.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          title: p.title,
          company: p.organization?.name ?? null,
          industry: p.organization?.industry ?? null,
          city: p.organization?.city ?? null,
        })),
        total: people.length,
        page,
      });
    }

    // Import mode
    const supabase = await createUserClient();

    // Dedup check
    const externalIds = people.map((p) => p.id);
    const { data: existing } = await supabase
      .from('leads')
      .select('external_id')
      .in('external_id', externalIds);
    const existingIds = new Set((existing ?? []).map((e) => e.external_id));
    const newPeople = people.filter((p) => !existingIds.has(p.id));

    if (newPeople.length === 0) {
      return NextResponse.json({
        imported: 0,
        duplicates: people.length,
        message: 'All leads already exist',
      });
    }

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
      return NextResponse.json({ error: 'Failed to insert leads', details: leadError.message }, { status: 500 });
    }

    // Insert contacts
    if (insertedLeads && insertedLeads.length > 0) {
      const leadIdMap = new Map(insertedLeads.map((l) => [l.external_id, l.id]));
      const contactsToInsert = newPeople
        .filter((p) => leadIdMap.has(p.id))
        .map((p) => mapApolloToContact(p, leadIdMap.get(p.id)!));

      if (contactsToInsert.length > 0) {
        await supabase.from('contacts').insert(contactsToInsert);
      }
    }

    return NextResponse.json({
      imported: insertedLeads?.length ?? 0,
      duplicates: people.length - newPeople.length,
      profileId: profile.id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Apollo search failed', details: String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ profiles: getActiveProfiles() });
}
