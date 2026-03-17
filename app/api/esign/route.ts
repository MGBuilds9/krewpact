import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { BoldSignClient } from '@/lib/esign/boldsign-client';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { esignEnvelopeCreateSchema } from '@/lib/validators/contracting';

const querySchema = z.object({
  contract_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const sendForSigningSchema = z.object({
  proposal_id: z.string().uuid(),
  message: z.string().optional(),
  expiry_days: z.number().int().min(1).max(365).optional(),
});

type SendParams = z.infer<typeof sendForSigningSchema>;
type SupabaseClient = Awaited<ReturnType<typeof createUserClientSafe>>['client'];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { contract_id, limit, offset } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('esign_envelopes')
    .select(
      'id, contract_id, provider, provider_envelope_id, status, signer_count, webhook_last_event_at, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (contract_id) query = query.eq('contract_id', contract_id);
  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;
  query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sendParsed = sendForSigningSchema.safeParse(body);
  if (sendParsed.success) return handleProposalSend(sendParsed.data, userId);

  const directParsed = esignEnvelopeCreateSchema.safeParse(body);
  if (!directParsed.success)
    return NextResponse.json({ error: directParsed.error.flatten() }, { status: 400 });

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('esign_envelopes')
    .insert(directParsed.data)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

async function resolveContractId(
  supabase: SupabaseClient,
  proposalId: string,
  proposalPayload: unknown,
): Promise<string | NextResponse> {
  const { data: contract } = await supabase
    .from('contract_terms')
    .select('id, contract_status')
    .eq('proposal_id', proposalId)
    .eq('contract_status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!contract) {
    const { data: newContract, error } = await supabase
      .from('contract_terms')
      .insert({
        proposal_id: proposalId,
        contract_status: 'pending_signature',
        legal_text_version: 'v1.0',
        terms_payload: proposalPayload ?? {},
      })
      .select('id')
      .single();
    if (error || !newContract)
      return NextResponse.json(
        { error: error?.message ?? 'Failed to create contract' },
        { status: 500 },
      );
    return newContract.id;
  }

  await supabase
    .from('contract_terms')
    .update({ contract_status: 'pending_signature' })
    .eq('id', contract.id);
  return contract.id;
}

function extractSigners(
  proposal: Record<string, unknown>,
): Array<{ name: string; emailAddress: string }> {
  const estimate = proposal.estimate as Record<string, unknown> | null;
  const account = estimate?.account as Record<string, unknown> | null;
  const contacts = (account?.contacts ?? []) as Array<Record<string, unknown>>;
  const signers: Array<{ name: string; emailAddress: string }> = [];
  contacts.forEach((contact) => {
    const email = contact.email as string | undefined;
    const name = contact.full_name as string | undefined;
    if (email && name) signers.push({ name, emailAddress: email });
  });
  return signers;
}

interface EnvelopeContext {
  contractId: string;
  signers: Array<{ name: string; emailAddress: string }>;
  accountName: string;
  proposalNumber: string;
  userId: string;
}

async function createBoldSignEnvelope(
  supabase: SupabaseClient,
  params: SendParams,
  ctx: EnvelopeContext,
): Promise<NextResponse> {
  const { contractId, signers, accountName, proposalNumber, userId } = ctx;
  const boldSign = new BoldSignClient();
  try {
    const { documentId } = await boldSign.createEnvelope({
      title: `Contract - ${proposalNumber} - ${accountName}`,
      message:
        params.message ?? `Please review and sign the contract for proposal ${proposalNumber}.`,
      signers,
      expiryDays: params.expiry_days ?? 30,
      enableSigningOrder: false,
    });

    const { data: envelope, error: envelopeError } = await supabase
      .from('esign_envelopes')
      .insert({
        provider: 'boldsign',
        provider_envelope_id: documentId,
        contract_id: contractId,
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
      logger.error('Failed to store esign envelope', { error: envelopeError.message, documentId });
      return NextResponse.json({ error: envelopeError.message }, { status: 500 });
    }

    await supabase
      .from('proposals')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', params.proposal_id);
    logger.info('E-sign envelope sent', {
      envelopeId: envelope.id,
      documentId,
      proposalId: params.proposal_id,
      contractId,
      signerCount: signers.length,
      mockMode: boldSign.isMockMode(),
    });

    return NextResponse.json(
      {
        envelope_id: envelope.id,
        document_id: documentId,
        contract_id: contractId,
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
    return NextResponse.json({ error: 'Failed to create e-sign envelope' }, { status: 502 });
  }
}

async function handleProposalSend(params: SendParams, userId: string): Promise<NextResponse> {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

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

  const contractIdResult = await resolveContractId(
    supabase,
    params.proposal_id,
    proposal.proposal_payload,
  );
  if (contractIdResult instanceof NextResponse) return contractIdResult;
  const contractId = contractIdResult;

  const signers = extractSigners(proposal as Record<string, unknown>);
  if (signers.length === 0) {
    return NextResponse.json(
      { error: 'No signers found. Ensure the account has contacts with email addresses.' },
      { status: 422 },
    );
  }

  const estimate = (proposal as Record<string, unknown>).estimate as Record<string, unknown> | null;
  const account = estimate?.account as Record<string, unknown> | null;
  const accountName = (account?.account_name as string) ?? 'Unknown Account';
  const proposalNumber = (proposal as Record<string, unknown>).proposal_number as string;

  return createBoldSignEnvelope(supabase, params, {
    contractId,
    signers,
    accountName,
    proposalNumber,
    userId,
  });
}
