import { timingSafeEqual } from 'https://deno.land/std@0.208.0/crypto/timing_safe_equal.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('APOLLO_WEBHOOK_SECRET');

interface ApolloWebhookPayload {
  event: string;
  data: {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    organization?: {
      name?: string;
      industry?: string;
      estimated_num_employees?: number;
    };
    phone_numbers?: { raw_number: string }[];
    linkedin_url?: string;
  };
}

function verifySignature(signature: string | null, _body: string): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;

  const encoder = new TextEncoder();
  const expected = encoder.encode(WEBHOOK_SECRET);
  const received = encoder.encode(signature);

  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const signature = req.headers.get('x-apollo-signature');
  const rawBody = await req.text();

  if (!verifySignature(signature, rawBody)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: ApolloWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!payload.data?.id) {
    return new Response(JSON.stringify({ error: 'Missing data.id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find the lead by external_id (Apollo person ID)
  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('external_id', payload.data.id)
    .maybeSingle();

  if (!lead) {
    return new Response(JSON.stringify({ message: 'Lead not found, skipping' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Upsert enrichment data
  const enrichmentUpdate: Record<string, unknown> = {};
  if (payload.data.organization) {
    enrichmentUpdate.enrichment_data = {
      apollo_webhook: {
        industry: payload.data.organization.industry,
        employees: payload.data.organization.estimated_num_employees,
        updated_at: new Date().toISOString(),
      },
    };
  }

  if (Object.keys(enrichmentUpdate).length > 0) {
    await supabase.from('leads').update(enrichmentUpdate).eq('id', lead.id);
  }

  // Update contact if we have new data
  if (payload.data.email || payload.data.phone_numbers?.length) {
    const contactUpdate: Record<string, unknown> = {};
    if (payload.data.email) contactUpdate.email = payload.data.email;
    if (payload.data.phone_numbers?.[0])
      contactUpdate.phone = payload.data.phone_numbers[0].raw_number;
    if (payload.data.title) contactUpdate.title = payload.data.title;

    await supabase
      .from('contacts')
      .update(contactUpdate)
      .eq('lead_id', lead.id)
      .eq('is_primary', true);
  }

  return new Response(JSON.stringify({ success: true, leadId: lead.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
