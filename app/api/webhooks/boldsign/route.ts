/**
 * BoldSign webhook receiver.
 *
 * Handles e-sign lifecycle events:
 *   - Completed: all signers signed -> download PDF, store, update contract
 *   - Declined: a signer declined
 *   - Expired: envelope expired
 *   - Other events: update status and log
 *
 * Auth: HMAC-SHA256 signature verification via x-boldsign-signature header.
 * Uses service client (bypasses RLS) since webhooks are system-level.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { BoldSignClient } from '@/lib/esign/boldsign-client';
import { logger } from '@/lib/logger';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================
// Types
// ============================================================

interface BoldSignWebhookEvent {
  event?: string;
  documentId?: string;
  status?: string;
  signerDetails?: Array<{
    signerEmail?: string;
    signerName?: string;
    status?: string;
    declineReason?: string;
  }>;
  [key: string]: unknown;
}

// ============================================================
// Signature verification
// ============================================================

function verifyBoldSignSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expected = hmac.digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

// ============================================================
// Notification helpers
// ============================================================

async function notifyContractSigned(
  supabase: ReturnType<typeof createServiceClient>,
  contractId: string,
  projectName: string,
  clientName: string,
): Promise<void> {
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .in('member_role', ['project_manager', 'accounting']);

  const memberUserIds = (members ?? []).map((m) => m.user_id);
  if (memberUserIds.length === 0) return;

  const { data: users } = await supabase
    .from('users')
    .select('email, first_name, last_name')
    .in('id', memberUserIds);

  const recipients = (users ?? []).map((u) => ({
    email: u.email,
    name: `${u.first_name} ${u.last_name}`.trim(),
  }));

  if (recipients.length === 0) return;

  dispatchNotification({
    type: 'contract_signed',
    recipients,
    contract_id: contractId,
    project_name: projectName,
    client_name: clientName,
    signed_at: new Date().toISOString(),
  }).catch((err) =>
    logger.error('Contract signed notification failed', {
      error: err instanceof Error ? err.message : String(err),
    }),
  );
}

// ============================================================
// Event handlers
// ============================================================

async function downloadSignedPdf(documentId: string): Promise<Buffer | null> {
  const boldSign = new BoldSignClient();
  try {
    return await boldSign.downloadDocument(documentId);
  } catch (err) {
    logger.error('BoldSign webhook: failed to download signed PDF', {
      documentId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function uploadSignedPdf(
  supabase: ReturnType<typeof createServiceClient>,
  documentId: string,
  pdf: Buffer,
): Promise<string | null> {
  const fileName = `signed-contracts/${documentId}/${Date.now()}-signed.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(fileName, pdf, { contentType: 'application/pdf', upsert: true });
  if (uploadError) {
    logger.error('BoldSign webhook: failed to upload signed PDF to storage', {
      documentId,
      error: uploadError.message,
    });
    return null;
  }
  return fileName;
}

async function finalizeEnvelopeRecords(
  supabase: ReturnType<typeof createServiceClient>,
  envelope: { id: string; contract_id: string },
  documentId: string,
  storagePath: string | null,
): Promise<void> {
  const docInsert: Record<string, unknown> = {
    envelope_id: envelope.id,
    signed_at: new Date().toISOString(),
  };
  if (storagePath) docInsert.file_id = storagePath;

  const { error: docError } = await supabase.from('esign_documents').insert(docInsert);
  if (docError)
    logger.error('BoldSign webhook: failed to create esign_document', {
      documentId,
      error: docError.message,
    });

  const { error: contractError } = await supabase
    .from('contract_terms')
    .update({ contract_status: 'signed', signed_at: new Date().toISOString() })
    .eq('id', envelope.contract_id);
  if (contractError)
    logger.error('BoldSign webhook: failed to update contract status', {
      documentId,
      contractId: envelope.contract_id,
      error: contractError.message,
    });

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, project_name, account_id')
      .eq('contract_id', envelope.contract_id)
      .single();
    if (project) {
      const accountResult = project.account_id
        ? await supabase
            .from('accounts')
            .select('account_name')
            .eq('id', project.account_id)
            .single()
        : { data: null };
      const clientName = accountResult.data?.account_name ?? 'Client';
      await notifyContractSigned(supabase, envelope.contract_id, project.project_name, clientName);
    }
  } catch (notifErr) {
    logger.error('BoldSign webhook: notification lookup failed', {
      documentId,
      error: notifErr instanceof Error ? notifErr.message : String(notifErr),
    });
  }
}

async function handleCompleted(
  documentId: string,
  event: BoldSignWebhookEvent,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const signedPdf = await downloadSignedPdf(documentId);
  const storagePath = signedPdf ? await uploadSignedPdf(supabase, documentId, signedPdf) : null;

  const { data: envelope } = await supabase
    .from('esign_envelopes')
    .select('id, contract_id')
    .eq('provider_envelope_id', documentId)
    .single();

  const { error: updateError } = await supabase
    .from('esign_envelopes')
    .update({
      status: 'completed',
      webhook_last_event_at: new Date().toISOString(),
      payload: event,
    })
    .eq('provider_envelope_id', documentId);
  if (updateError) {
    logger.error('BoldSign webhook: failed to update envelope status', {
      documentId,
      error: updateError.message,
    });
    return;
  }

  if (envelope) await finalizeEnvelopeRecords(supabase, envelope, documentId, storagePath);

  logger.info('BoldSign webhook: envelope completed', {
    documentId,
    storagePath,
    contractId: envelope?.contract_id,
  });
}

async function handleDeclined(
  documentId: string,
  event: BoldSignWebhookEvent,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const declineReason = event.signerDetails?.find((s) => s.status === 'Declined')?.declineReason;

  const { error } = await supabase
    .from('esign_envelopes')
    .update({
      status: 'declined',
      webhook_last_event_at: new Date().toISOString(),
      payload: event,
    })
    .eq('provider_envelope_id', documentId);

  if (error) {
    logger.error('BoldSign webhook: failed to update declined status', {
      documentId,
      error: error.message,
    });
    return;
  }

  logger.info('BoldSign webhook: envelope declined', {
    documentId,
    declineReason,
  });
}

async function handleExpired(
  documentId: string,
  event: BoldSignWebhookEvent,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const { error } = await supabase
    .from('esign_envelopes')
    .update({
      status: 'expired',
      webhook_last_event_at: new Date().toISOString(),
      payload: event,
    })
    .eq('provider_envelope_id', documentId);

  if (error) {
    logger.error('BoldSign webhook: failed to update expired status', {
      documentId,
      error: error.message,
    });
    return;
  }

  logger.info('BoldSign webhook: envelope expired', { documentId });
}

async function handleGenericEvent(
  documentId: string,
  event: BoldSignWebhookEvent,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const mappedStatus = event.status ? BoldSignClient.mapEventStatus(event.status) : undefined;

  const updatePayload: Record<string, unknown> = {
    webhook_last_event_at: new Date().toISOString(),
    payload: event,
  };

  if (mappedStatus) {
    updatePayload.status = mappedStatus;
  }

  const { error } = await supabase
    .from('esign_envelopes')
    .update(updatePayload)
    .eq('provider_envelope_id', documentId);

  if (error) {
    logger.error('BoldSign webhook: failed to update envelope', {
      documentId,
      eventType: event.event,
      error: error.message,
    });
  }

  logger.info('BoldSign webhook: event processed', {
    documentId,
    eventType: event.event,
    mappedStatus,
  });
}

// ============================================================
// Route handler
// ============================================================

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 100, window: '1 m', identifier: 'webhook:boldsign' });
  if (!rl.success) return rateLimitResponse(rl);

  const rawBody = await req.text();

  // BoldSign sends a verification POST when adding a webhook — respond 200
  // before checking signatures so the webhook can be registered
  const signature = req.headers.get('x-boldsign-signature') ?? '';
  const webhookSecret = process.env.BOLDSIGN_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // No secret configured — accept verification pings, reject real events
    logger.warn('BOLDSIGN_WEBHOOK_SECRET not set — accepting as verification ping');
    return NextResponse.json({ message: 'Webhook endpoint active' });
  }

  if (signature && !verifyBoldSignSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: BoldSignWebhookEvent;
  try {
    event = JSON.parse(rawBody) as BoldSignWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const documentId = event.documentId;
  if (!documentId) {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const eventType = event.event ?? event.status ?? 'unknown';

  try {
    switch (eventType) {
      case 'Completed':
        await handleCompleted(documentId, event, supabase);
        break;
      case 'Declined':
        await handleDeclined(documentId, event, supabase);
        break;
      case 'Expired':
        await handleExpired(documentId, event, supabase);
        break;
      default:
        await handleGenericEvent(documentId, event, supabase);
        break;
    }
  } catch (err) {
    logger.error('BoldSign webhook: unhandled error', {
      documentId,
      eventType,
      error: err instanceof Error ? err.message : String(err),
    });
    // Still return 200 to prevent BoldSign from retrying
  }

  return NextResponse.json({ received: true });
}
