import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_RETRIES = 3;

export interface DLQEntry {
  enrollment_id: string;
  step_id: string;
  error_message: string;
  retry_count: number;
  last_attempted_at: string;
}

/**
 * Checks the retry count on an enrollment.
 * If retry_count >= MAX_RETRIES, moves to dead_letter status and returns true.
 * Otherwise increments retry_count and returns false (still active, will retry).
 */
export async function checkAndMoveToDLQ(
  supabase: SupabaseClient,
  enrollmentId: string,
  stepId: string,
  errorMessage: string,
): Promise<boolean> {
  const { data: enrollment, error: fetchError } = await supabase
    .from('sequence_enrollments')
    .select('retry_count, status')
    .eq('id', enrollmentId)
    .single();

  if (fetchError || !enrollment) {
    // Cannot determine retry count — conservatively move to DLQ
    await supabase
      .from('sequence_enrollments')
      .update({
        status: 'dead_letter',
        metadata: {
          dlq_step_id: stepId,
          dlq_error: errorMessage,
          dlq_moved_at: new Date().toISOString(),
        },
      })
      .eq('id', enrollmentId);
    return true;
  }

  const currentRetries = (enrollment.retry_count as number) ?? 0;

  if (currentRetries >= MAX_RETRIES) {
    // Move to dead-letter queue
    const { error: updateError } = await supabase
      .from('sequence_enrollments')
      .update({
        status: 'dead_letter',
        retry_count: currentRetries,
        metadata: {
          dlq_step_id: stepId,
          dlq_error: errorMessage,
          dlq_moved_at: new Date().toISOString(),
        },
      })
      .eq('id', enrollmentId);

    if (updateError) {
      throw new Error(`Failed to move enrollment ${enrollmentId} to DLQ: ${updateError.message}`);
    }

    return true;
  }

  // Increment retry count, keep active
  const { error: retryError } = await supabase
    .from('sequence_enrollments')
    .update({
      retry_count: currentRetries + 1,
      metadata: {
        last_error: errorMessage,
        last_error_step_id: stepId,
        last_attempted_at: new Date().toISOString(),
      },
    })
    .eq('id', enrollmentId);

  if (retryError) {
    throw new Error(`Failed to increment retry count for enrollment ${enrollmentId}: ${retryError.message}`);
  }

  return false;
}

/**
 * Returns all enrollments with status 'dead_letter'.
 */
export async function getDLQEntries(supabase: SupabaseClient): Promise<DLQEntry[]> {
  const { data, error } = await supabase
    .from('sequence_enrollments')
    .select('id, current_step_id, retry_count, metadata, updated_at')
    .eq('status', 'dead_letter')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch DLQ entries: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return {
      enrollment_id: row.id as string,
      step_id: (meta.dlq_step_id as string) ?? (row.current_step_id as string) ?? '',
      error_message: (meta.dlq_error as string) ?? '',
      retry_count: (row.retry_count as number) ?? MAX_RETRIES,
      last_attempted_at: (meta.dlq_moved_at as string) ?? (row.updated_at as string) ?? '',
    };
  });
}

/**
 * Resets a dead-letter enrollment back to active with retry_count = 0.
 */
export async function retryDLQEntry(supabase: SupabaseClient, enrollmentId: string): Promise<void> {
  const { error } = await supabase
    .from('sequence_enrollments')
    .update({
      status: 'active',
      retry_count: 0,
      metadata: {
        dlq_retried_at: new Date().toISOString(),
      },
    })
    .eq('id', enrollmentId)
    .eq('status', 'dead_letter');

  if (error) {
    throw new Error(`Failed to retry DLQ entry ${enrollmentId}: ${error.message}`);
  }
}

export { MAX_RETRIES };
