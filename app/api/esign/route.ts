import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { BoldSignClient } from '@/lib/esign/boldsign-client';
import { esignEnvelopeCreateSchema } from '@/lib/validators/contracting';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const querySchema = z.object({
  contract_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { contract_id, limit, offset } = parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('esign_envelopes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (contract_id) query = query.eq('contract_id', contract_id);

  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;
  query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
}

// ============================================================
// POST /api/esign — Send a proposal/contract for e-signing
// ============================================================

const sendForSigningSchema = z.object({
  /** ID of the proposal to send for signing */
  proposal_id: z.string().uuid(),
  /** Optional override for the signing email message */
  message: z.string().optional(),
  /** Number of days before the envelope expires (default: 30) */
  expiry_days: z.number().int().min(1).max(365).optional(),
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

  // Support both flows: direct envelope create or proposal-based send
  const sendParsed = sendForSigningSchema.safeParse(body);

  if (sendParsed.success) {
    // Proposal-based flow: look up proposal, contract, contacts, then send via BoldSign
    return handleProposalSend(sendParsed.data, userId);
  }

  // Fallback: direct envelope creation (existing CRUD pattern)
  const directParsed = esignEnvelopeCreateSchema.safeParse(body);
  if (!directParsed.success) {
    return NextResponse.json({ error: directParsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('esign_envelopes')
    .insert(directParsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// ============================================================
// Proposal-based e-sign flow
// ============================================================

async function handleProposalSend(
  params: z.infer<typeof sendForSigningSchema>,
  userId: string,
) {
  const supabase = await createUserClient();

  // 1. Look up the proposal
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .select('*, estimate:estimates(*, account:accounts(*, contacts:contacts(*)))')
    .eq('id', params.proposal_id)
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json(
      { error: proposalError?.message ?? 'Proposal not found' },
      { status: proposalError?.code === 'PGRST116' ? 404 : 500 },
    );
  }

  // 2. Get or create contract_terms for this proposal
  let { data: contract } = await supabase
    .from('contract_terms')
    .select('*')
    .eq('proposal_id', params.proposal_id)
    .eq('contract_status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!contract) {
    const { data: newContract, error: createError } = await supabase
      .from('contract_terms')
      .insert({
        proposal_id: params.proposal_id,
        contract_status: 'pending_signature',
        legal_text_version: 'v1.0',
        terms_payload: proposal.proposal_payload ?? {},
      })
      .select()
      .single();

    if (createError || !newContract) {
      return NextResponse.json(
        { error: createError?.message ?? 'Failed to create contract' },
        { status: 500 },
      );
    }
    contract = newContract;
  } else {
    // Update existing draft to pending_signature
    await supabase
      .from('contract_terms')
      .update({ contract_status: 'pending_signature' })
      .eq('id', contract.id);
  }

  // 3. Gather signer info from contacts
  const estimate = proposal.estimate as Record<string, unknown> | null;
  const account = estimate?.account as Record<string, unknown> | null;
  const contacts = (account?.contacts ?? []) as Array<Record<string, unknown>>;

  // Use the first contact as the primary signer, or fall back to account info
  const signers: Array<{ name: string; emailAddress: string }> = [];
  if (contacts.length > 0) {
    for (const contact of contacts) {
      const email = contact.email as string | undefined;
      const name = contact.full_name as string | undefined;
      if (email && name) {
        signers.push({ name, emailAddress: email });
      }
    }
  }

  if (signers.length === 0) {
    return NextResponse.json(
      { error: 'No signers found. Ensure the account has contacts with email addresses.' },
      { status: 422 },
    );
  }

  // 4. Create envelope via BoldSign
  const boldSign = new BoldSignClient();
  const accountName = (account?.account_name as string) ?? 'Unknown Account';
  const proposalNumber = proposal.proposal_number as string;

  try {
    const { documentId } = await boldSign.createEnvelope({
      title: `Contract - ${proposalNumber} - ${accountName}`,
      message:
        params.message ??
        `Please review and sign the contract for proposal ${proposalNumber}.`,
      signers,
      expiryDays: params.expiry_days ?? 30,
      enableSigningOrder: false,
    });

    // 5. Store envelope record
    const { data: envelope, error: envelopeError } = await supabase
      .from('esign_envelopes')
      .insert({
        provider: 'boldsign',
        provider_envelope_id: documentId,
        contract_id: contract.id,
        status: boldSign.isMockMode() ? 'mock_sent' : 'sent',
        signer_count: signers.length,
        payload: {
          title: `Contract - ${proposalNumber} - ${accountName}`,
          signers: signers.map((s) => s.emailAddress),
          created_by: userId,
          mock_mode: boldSign.isMockMode(),
        },
      })
      .select()
      .single();

    if (envelopeError) {
      logger.error('Failed to store esign envelope', {
        error: envelopeError.message,
        documentId,
      });
      return NextResponse.json(
        { error: envelopeError.message },
        { status: 500 },
      );
    }

    // 6. Update proposal status to 'sent'
    await supabase
      .from('proposals')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', params.proposal_id);

    logger.info('E-sign envelope sent', {
      envelopeId: envelope.id,
      documentId,
      proposalId: params.proposal_id,
      contractId: contract.id,
      signerCount: signers.length,
      mockMode: boldSign.isMockMode(),
    });

    return NextResponse.json(
      {
        envelope_id: envelope.id,
        document_id: documentId,
        contract_id: contract.id,
        status: envelope.status,
        signer_count: signers.length,
        mock_mode: boldSign.isMockMode(),
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error('BoldSign createEnvelope failed', {
      error: err instanceof Error ? err.message : String(err),
      proposalId: params.proposal_id,
    });
    return NextResponse.json(
      { error: 'Failed to create e-sign envelope' },
      { status: 502 },
    );
  }
}
