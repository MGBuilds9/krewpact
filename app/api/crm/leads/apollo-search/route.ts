import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound, serverError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { mapApolloToContact, mapApolloToLead, searchPeople } from '@/lib/integrations/apollo';
import { getActiveProfiles, getProfileById } from '@/lib/integrations/apollo-profiles';
import { createUserClientSafe } from '@/lib/supabase/server';

const searchSchema = z.object({
  profileId: z.string().min(1),
  page: z.number().int().positive().optional().default(1),
  import: z.boolean().optional().default(false),
});

type ApolloProfile = NonNullable<ReturnType<typeof getProfileById>>;
type ApolloPerson = Awaited<ReturnType<typeof searchPeople>>[number];
type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

function formatPreviewResults(people: ApolloPerson[], profile: ApolloProfile, page: number) {
  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      divisionCode: profile.divisionCode,
      vertical: profile.vertical,
    },
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

async function importPeople(
  supabase: SupabaseClient,
  people: ApolloPerson[],
  profile: ApolloProfile,
): Promise<NextResponse> {
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

  if (leadError) throw dbError(`Failed to insert leads: ${leadError.message}`);

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
}

export const POST = withApiRoute({ bodySchema: searchSchema }, async ({ body }) => {
  const { profileId, page, import: shouldImport } = body as z.infer<typeof searchSchema>;

  const profile = getProfileById(profileId);
  if (!profile) throw notFound(`Profile '${profileId}'`);

  let people: Awaited<ReturnType<typeof searchPeople>>;
  try {
    people = await searchPeople({ ...profile.searchParams, per_page: 25, page });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw serverError(`Apollo search failed: ${msg}`);
  }
  if (!shouldImport) return formatPreviewResults(people, profile, page);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  return importPeople(supabase, people, profile);
});

export const GET = withApiRoute({}, async () => {
  return NextResponse.json({ profiles: getActiveProfiles() });
});
