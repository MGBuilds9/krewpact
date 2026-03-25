import { createServiceClient, createUserClientSafe } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { Attachment, DistributionLog } from '@/lib/validators/document-control';

const BUCKET = 'documents';

export type EntityType = 'rfi' | 'submittal';

interface UploadResult {
  id: string;
  storagePath: string;
  publicUrl: string;
}

interface DistributionRecipient {
  user_id: string;
  email: string;
  name: string;
}

// ============================================================
// Attachment operations
// ============================================================

/**
 * Upload a file to Supabase Storage and record its metadata.
 * The storage path is: {entityType}/{entityId}/{timestamp}-{fileName}
 */
export async function uploadAttachment(
  file: File,
  entityType: EntityType,
  entityId: string,
  uploadedBy: string,
): Promise<UploadResult> {
  const supabase = createServiceClient();
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${entityType}/${entityId}/${timestamp}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    logger.error('[document-control] Storage upload failed', { message: uploadError.message });
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error: dbError } = await supabase
    .from('document_attachments')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: uploadedBy,
    })
    .select('id')
    .single();

  if (dbError) {
    logger.error('[document-control] Attachment record insert failed', { message: dbError.message });
    // Clean up orphaned storage object
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Failed to record attachment: ${dbError.message}`);
  }

  return {
    id: data.id as string,
    storagePath,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * List active (non-deleted) attachments for an entity.
 */
export async function listAttachments(
  entityType: EntityType,
  entityId: string,
): Promise<Attachment[]> {
  const { client, error: authError } = await createUserClientSafe();
  if (authError) {
    throw new Error('Authentication required');
  }

  const { data, error } = await client
    .from('document_attachments')
    .select(
      'id, entity_type, entity_id, file_name, storage_path, mime_type, size_bytes, uploaded_by, deleted_at, created_at',
    )
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[document-control] List attachments failed', { message: error.message });
    throw new Error(`Failed to list attachments: ${error.message}`);
  }

  return (data ?? []) as Attachment[];
}

/**
 * Soft-delete an attachment record (does not remove from storage).
 */
export async function deleteAttachment(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('document_attachments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    logger.error('[document-control] Delete attachment failed', { message: error.message });
    throw new Error(`Failed to delete attachment: ${error.message}`);
  }
}

/**
 * Get a signed download URL for an attachment (60-minute expiry).
 */
export async function getAttachmentSignedUrl(storagePath: string): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

// ============================================================
// Distribution log operations
// ============================================================

/**
 * Record that a submittal was distributed to a set of recipients.
 */
export async function createDistributionLog(
  submittalId: string,
  recipients: DistributionRecipient[],
): Promise<DistributionLog[]> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const rows = recipients.map((r) => ({
    submittal_id: submittalId,
    recipient_user_id: r.user_id,
    recipient_email: r.email,
    recipient_name: r.name,
    status: 'sent' as const,
    sent_at: now,
    acknowledged_at: null,
  }));

  const { data, error } = await supabase
    .from('submittal_distributions')
    .insert(rows)
    .select(
      'id, submittal_id, recipient_user_id, recipient_email, recipient_name, status, sent_at, acknowledged_at, created_at',
    );

  if (error) {
    logger.error('[document-control] Create distribution log failed', { message: error.message });
    throw new Error(`Failed to create distribution log: ${error.message}`);
  }

  return (data ?? []) as DistributionLog[];
}

/**
 * Retrieve the full distribution log for a submittal.
 */
export async function getDistributionLog(submittalId: string): Promise<DistributionLog[]> {
  const { client, error: authError } = await createUserClientSafe();
  if (authError) {
    throw new Error('Authentication required');
  }

  const { data, error } = await client
    .from('submittal_distributions')
    .select(
      'id, submittal_id, recipient_user_id, recipient_email, recipient_name, status, sent_at, acknowledged_at, created_at',
    )
    .eq('submittal_id', submittalId)
    .order('sent_at', { ascending: false });

  if (error) {
    logger.error('[document-control] Get distribution log failed', { message: error.message });
    throw new Error(`Failed to get distribution log: ${error.message}`);
  }

  return (data ?? []) as DistributionLog[];
}
