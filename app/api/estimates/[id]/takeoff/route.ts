import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { takeoffEngine } from '@/lib/takeoff/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserClient = any;

async function uploadTakeoffFiles(
  supabase: UserClient,
  files: File[],
  estimateId: string,
  jobId: string,
): Promise<{ file: File; storagePath: string; signedUrl: string | null }[]> {
  return Promise.all(
    files.map(async (file) => {
      const storagePath = `${estimateId}/${jobId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('takeoff-plans')
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw new Error(`Upload failed for "${file.name}": ${uploadError.message}`);
      const { data: signedData } = await supabase.storage
        .from('takeoff-plans')
        .createSignedUrl(storagePath, 86400);
      return { file, storagePath, signedUrl: signedData?.signedUrl ?? null };
    }),
  );
}

async function insertFileMetadata(
  supabase: UserClient,
  uploadResults: { file: File; storagePath: string; signedUrl: string | null }[],
  krewpactUserId: string | null,
): Promise<{ fileId: string; storagePath: string; filename: string }[] | NextResponse> {
  const fileRecords: { fileId: string; storagePath: string; filename: string }[] = [];
  for (const { file, storagePath } of uploadResults) {
    const { data: meta, error: metaError } = await supabase
      .from('file_metadata')
      .insert({
        filename: file.name,
        original_filename: file.name,
        file_path: storagePath,
        storage_bucket: 'takeoff-plans',
        file_size_bytes: file.size,
        mime_type: 'application/pdf',
        source_system: 'takeoff',
        uploaded_by: krewpactUserId,
      })
      .select('id')
      .single();
    if (metaError) {
      logger.error('takeoff/POST: file_metadata insert failed', { error: metaError.message });
      return NextResponse.json({ error: 'Failed to record file metadata' }, { status: 500 });
    }
    fileRecords.push({ fileId: meta.id as string, storagePath, filename: file.name });
  }
  return fileRecords;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('takeoff_jobs')
    .select('*, takeoff_plans(id, filename, storage_path)')
    .eq('estimate_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('takeoff/GET: failed to list jobs', { estimateId: id, error: error.message });
    throw dbError(error.message);
  }

  return NextResponse.json({ jobs: data });
});

export const POST = withApiRoute(
  { rateLimit: { limit: 20, window: '1 m' } },
  async ({ req, params, userId: _userId }) => {
    const { id } = params;

    // Retrieve session claims for krewpact_user_id
    const { auth } = await import('@clerk/nextjs/server');
    const session = await auth();
    const krewpactUserId = (session.sessionClaims?.krewpact_user_id as string | undefined) ?? null;

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // Verify estimate exists and is editable
    const { data: estimate } = await supabase
      .from('estimates')
      .select('id, status')
      .eq('id', id)
      .single();
    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    if (estimate.status !== 'draft' && estimate.status !== 'review') {
      return NextResponse.json(
        { error: 'Estimate must be in draft or review status' },
        { status: 400 },
      );
    }

    // Check no active job exists
    const { data: activeJobs } = await supabase
      .from('takeoff_jobs')
      .select('id, status')
      .eq('estimate_id', id)
      .in('status', ['pending', 'processing', 'classifying', 'extracting', 'costing']);
    if (activeJobs && activeJobs.length > 0) {
      return NextResponse.json({ error: 'A takeoff job is already in progress' }, { status: 409 });
    }

    // Parse and validate form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const files = formData.getAll('files') as File[];
    if (!files.length)
      return NextResponse.json({ error: 'At least 1 file required' }, { status: 400 });
    if (files.length > MAX_FILES)
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 });
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE)
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 50MB limit` },
          { status: 400 },
        );
      if (file.type !== 'application/pdf')
        return NextResponse.json({ error: `File "${file.name}" must be a PDF` }, { status: 400 });
    }

    const jobId = crypto.randomUUID();
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/takeoff`;
    const callbackToken = process.env.TAKEOFF_ENGINE_TOKEN ?? '';

    // Upload all files in parallel
    let uploadResults: { file: File; storagePath: string; signedUrl: string | null }[];
    try {
      uploadResults = await uploadTakeoffFiles(supabase, files, id, jobId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('takeoff/POST: file upload failed', { estimateId: id, error: msg });
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Insert file_metadata records sequentially, collect IDs
    const fileRecordsResult = await insertFileMetadata(supabase, uploadResults, krewpactUserId);
    if (fileRecordsResult instanceof NextResponse) return fileRecordsResult;
    const fileRecords = fileRecordsResult;

    // Create takeoff_jobs record (don't store token in config — read from env at runtime)
    const { error: jobError } = await supabase.from('takeoff_jobs').insert({
      id: jobId,
      estimate_id: id,
      status: 'pending',
      created_by: krewpactUserId,
      config: { callback_url: callbackUrl },
    });
    if (jobError) {
      logger.error('takeoff/POST: failed to create job', {
        estimateId: id,
        error: jobError.message,
      });
      throw dbError(jobError.message);
    }

    // Create takeoff_plans records
    await supabase.from('takeoff_plans').insert(
      fileRecords.map(({ fileId, storagePath, filename }) => ({
        job_id: jobId,
        file_id: fileId,
        filename,
        storage_path: storagePath,
      })),
    );

    // Call engine
    const signedUrls = uploadResults.map((r) => r.signedUrl ?? '');
    const filenames = files.map((f) => f.name);
    let engineJobId: string | null = null;

    try {
      const engineResult = await takeoffEngine.createJob({
        estimate_id: id,
        file_urls: signedUrls,
        filenames,
        config: { callback_url: callbackUrl, callback_token: callbackToken },
      });
      engineJobId = engineResult.job_id;
      await supabase
        .from('takeoff_jobs')
        .update({ config: { callback_url: callbackUrl, engine_job_id: engineJobId } })
        .eq('id', jobId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('takeoff/POST: engine call failed', { jobId, error: msg });
      await supabase
        .from('takeoff_jobs')
        .update({ status: 'failed', error_message: msg })
        .eq('id', jobId);
      return NextResponse.json(
        { error: 'Takeoff engine unavailable', details: msg },
        { status: 502 },
      );
    }

    // Return the full job record so the client has all fields
    const { data: createdJob } = await supabase
      .from('takeoff_jobs')
      .select('*, takeoff_plans(id, filename, storage_path)')
      .eq('id', jobId)
      .single();

    return NextResponse.json(createdJob ?? { id: jobId, status: 'pending' }, { status: 201 });
  },
);
