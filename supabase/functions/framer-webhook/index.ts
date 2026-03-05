import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-webhook-secret, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SERVICE_TO_DIVISION: Record<string, string> = {
  general: 'contracting',
  'electrical contracting': 'contracting',
  telecom: 'telecom',
  'telecom infrastructure': 'telecom',
  wood: 'wood',
  'wood industries': 'wood',
};

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) return false;
  let result = 0;
  for (let i = 0; i < aBuf.byteLength; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
}

function mapDivision(service: string | undefined): string {
  if (!service) return 'contracting';
  return SERVICE_TO_DIVISION[service.toLowerCase().trim()] ?? 'contracting';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Verify webhook secret
  const secret = Deno.env.get('FRAMER_WEBHOOK_SECRET');
  const provided = req.headers.get('x-webhook-secret') ?? '';
  if (!secret || !timingSafeEqual(secret, provided)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Framer sends field labels as keys
  const firstName = body['First name'] ?? body['first_name'] ?? '';
  const lastName = body['Last name'] ?? body['last_name'] ?? '';
  const email = body['Email'] ?? body['email'] ?? '';
  const service = body['Service'] ?? body['service'] ?? '';
  const message = body['Message'] ?? body['message'] ?? '';
  const phone = body['Phone'] ?? body['phone'] ?? '';

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const divisionId = mapDivision(service);

  // Build company name from contact name (website leads don't have company info)
  const contactName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
  const companyName = `Website Inquiry - ${contactName}`;

  // Insert lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      company_name: companyName,
      source_channel: 'website',
      status: 'new',
      division_id: divisionId,
      notes: message || null,
    })
    .select('id')
    .single();

  if (leadError) {
    console.error('Lead insert error:', leadError);
    return new Response(JSON.stringify({ error: 'Failed to create lead' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Insert contact (non-blocking — matches KrewPact pattern)
  const { error: contactError } = await supabase.from('contacts').insert({
    lead_id: lead.id,
    full_name: contactName,
    first_name: firstName || null,
    last_name: lastName || null,
    email,
    phone: phone || null,
    is_primary: true,
  });

  if (contactError) {
    console.error('Contact insert error (non-blocking):', contactError);
  }

  return new Response(
    JSON.stringify({
      success: true,
      lead_id: lead.id,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
