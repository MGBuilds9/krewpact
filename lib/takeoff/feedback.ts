/**
 * Takeoff feedback submission to engine.
 *
 * Called via QStash after an estimator reviews draft lines.
 * Engine failure is non-fatal — feedback is already persisted in Supabase.
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

import { takeoffEngine } from './client';

/**
 * Read feedback records from Supabase and submit to the engine.
 * @param engineJobId - The engine's job ID (not the Supabase job ID)
 * @param supabaseJobId - The Supabase takeoff_jobs.id
 */
export async function submitFeedbackToEngine(
  engineJobId: string,
  supabaseJobId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: feedbackRecords, error } = await supabase
    .from('takeoff_feedback')
    .select('id, draft_line_id, feedback_type, original_value, corrected_value')
    .eq('job_id', supabaseJobId);

  if (error) {
    logger.error('Failed to read takeoff feedback from Supabase', {
      supabaseJobId,
      error: error.message,
    });
    throw error;
  }

  if (!feedbackRecords || feedbackRecords.length === 0) {
    logger.info('No feedback records to submit', { supabaseJobId });
    return;
  }

  const payload = feedbackRecords.map((r) => ({
    draft_line_id: r.draft_line_id,
    feedback_type: r.feedback_type,
    original_value: r.original_value,
    corrected_value: r.corrected_value,
  }));

  try {
    await takeoffEngine.submitFeedback(engineJobId, payload);
    logger.info('Takeoff feedback submitted to engine', {
      engineJobId,
      count: payload.length,
    });
  } catch (err) {
    logger.error('Failed to submit feedback to engine', {
      engineJobId,
      count: payload.length,
      error: err instanceof Error ? err.message : String(err),
    });
    // Re-throw so QStash retries
    throw err;
  }
}
