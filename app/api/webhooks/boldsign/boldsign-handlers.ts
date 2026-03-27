import { BoldSignClient } from '@/lib/esign/boldsign-client';
import { logger } from '@/lib/logger';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { createServiceClient } from '@/lib/supabase/server';

export interface BoldSignWebhookEvent {
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

export async function handleCompleted(
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

export async function handleDeclined(
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

  logger.info('BoldSign webhook: envelope declined', { documentId, declineReason });
}

export async function handleExpired(
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

export async function handleGenericEvent(
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
