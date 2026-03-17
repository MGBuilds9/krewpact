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
// Event handlers
// ============================================================

async function handleCompleted(
  documentId: string,
  event: BoldSignWebhookEvent,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  // Download the signed PDF
  const boldSign = new BoldSignClient();
  let signedPdf: Buffer | null = null;

  try {
    signedPdf = await boldSign.downloadDocument(documentId);
  } catch (err) {
    logger.error('BoldSign webhook: failed to download signed PDF', {
      documentId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Continue updating status even if download fails
  }

  // Store signed PDF in Supabase Storage if downloaded
  let storagePath: string | null = null;
  if (signedPdf) {
    const fileName = `signed-contracts/${documentId}/${Date.now()}-signed.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(fileName, signedPdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      logger.error('BoldSign webhook: failed to upload signed PDF to storage', {
        documentId,
        error: uploadError.message,
      });
    } else {
      storagePath = fileName;
    }
  }

  // Update envelope status
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

  // Look up the envelope to get the contract_id
  const { data: envelope } = await supabase
    .from('esign_envelopes')
    .select('id, contract_id')
    .eq('provider_envelope_id', documentId)
    .single();

  if (envelope) {
    // Create esign_document record
    const docInsert: Record<string, unknown> = {
      envelope_id: envelope.id,
      signed_at: new Date().toISOString(),
    };

    if (storagePath) {
      docInsert.file_id = storagePath;
    }

    const { error: docError } = await supabase.from('esign_documents').insert(docInsert);

    if (docError) {
      logger.error('BoldSign webhook: failed to create esign_document', {
        documentId,
        error: docError.message,
      });
    }

    // Update contract_terms status to 'signed'
    const { error: contractError } = await supabase
      .from('contract_terms')
      .update({
        contract_status: 'signed',
        signed_at: new Date().toISOString(),
      })
      .eq('id', envelope.contract_id);

    if (contractError) {
      logger.error('BoldSign webhook: failed to update contract status', {
        documentId,
        contractId: envelope.contract_id,
        error: contractError.message,
      });
    }

    // Fire-and-forget: notify PM and accounting that contract was signed
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('id, project_name, account_id')
        .eq('contract_id', envelope.contract_id)
        .single();

      if (project) {
        const [accountResult, membersResult] = await Promise.all([
          project.account_id
            ? supabase.from('accounts').select('account_name').eq('id', project.account_id).single()
            : Promise.resolve({ data: null }),
          supabase
            .from('project_members')
            .select('user_id, member_role')
            .eq('project_id', project.id)
            .in('member_role', ['project_manager', 'accounting']),
        ]);

        const memberUserIds = (membersResult.data ?? []).map((m) => m.user_id);

        if (memberUserIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('email, first_name, last_name')
            .in('id', memberUserIds);

          const recipients = (users ?? []).map((u) => ({
            email: u.email,
            name: `${u.first_name} ${u.last_name}`.trim(),
          }));

          if (recipients.length > 0) {
            dispatchNotification({
              type: 'contract_signed',
              recipients,
              contract_id: envelope.contract_id,
              project_name: project.project_name,
              client_name: accountResult.data?.account_name ?? 'Client',
              signed_at: new Date().toISOString(),
            }).catch((err) =>
              logger.error('Contract signed notification failed', {
                error: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        }
      }
    } catch (notifErr) {
      logger.error('BoldSign webhook: notification lookup failed', {
        documentId,
        error: notifErr instanceof Error ? notifErr.message : String(notifErr),
      });
    }
  }

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

  const webhookSecret = process.env.BOLDSIGN_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('BOLDSIGN_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-boldsign-signature') ?? '';

  if (!verifyBoldSignSignature(rawBody, signature, webhookSecret)) {
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
