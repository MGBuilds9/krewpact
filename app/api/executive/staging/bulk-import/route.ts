import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createServiceClient } from '@/lib/supabase/server';
import { stagingBulkImportSchema } from '@/lib/validators/executive';

const ADMIN_ROLES = ['platform_admin'];

interface FileDetail {
  path: string;
  status: 'imported' | 'skipped' | 'error';
  reason?: string;
}

interface FileInput {
  path: string;
  category?: string;
  division_id?: string;
  tags?: string[];
}

type SupabaseClient = Awaited<ReturnType<typeof createServiceClient>>;

interface ProcessResult {
  status: 'imported' | 'skipped' | 'error';
  reason?: string;
}

async function processOneFile(
  supabase: SupabaseClient,
  file: FileInput,
  orgId: string,
): Promise<ProcessResult> {
  const filePath = file.path;

  let isFile = false;
  try {
    const fileStats = await stat(filePath);
    isFile = fileStats.isFile();
  } catch {
    return { status: 'error', reason: 'File not found or inaccessible' };
  }

  if (!isFile) return { status: 'error', reason: 'Path is not a file' };

  let rawContent: string;
  try {
    rawContent = await readFile(filePath, 'utf-8');
  } catch {
    return { status: 'error', reason: 'Failed to read file' };
  }

  if (!rawContent.trim()) return { status: 'skipped', reason: 'File is empty' };

  const headingMatch = rawContent.match(/^#\s+(.+)$/m);
  const title = headingMatch
    ? headingMatch[1].trim()
    : path.basename(filePath, path.extname(filePath));

  const contentChecksum = createHash('sha256').update(rawContent).digest('hex');

  const { data: existing } = await supabase
    .from('knowledge_staging')
    .select('id')
    .eq('content_checksum', contentChecksum)
    .eq('org_id', orgId);

  if (existing && existing.length > 0) return { status: 'skipped', reason: 'duplicate checksum' };

  const strippedContent = rawContent.replace(/^---[\s\S]*?---\n*/m, '');

  const { error: insertError } = await supabase.from('knowledge_staging').insert({
    title,
    raw_content: strippedContent,
    source_type: 'vault_import',
    source_path: filePath,
    content_checksum: contentChecksum,
    org_id: orgId,
    status: 'pending_review',
    ...(file.category && { category: file.category }),
    ...(file.division_id && { division_id: file.division_id }),
    ...(file.tags && { tags: file.tags }),
  });

  if (insertError) return { status: 'error', reason: 'Database insert failed' };

  return { status: 'imported' };
}

export const POST = withApiRoute(
  { roles: ADMIN_ROLES, bodySchema: stagingBulkImportSchema },
  async ({ body, orgId }) => {
    if (!orgId)
      return NextResponse.json({ error: 'Organization context required' }, { status: 500 });

    const supabase = await createServiceClient();

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const details: FileDetail[] = [];

    for (const file of body.files) {
      const result = await processOneFile(supabase, file, orgId);
      details.push({ path: file.path, status: result.status, reason: result.reason });
      if (result.status === 'imported') imported++;
      else if (result.status === 'skipped') skipped++;
      else errors++;
    }

    return NextResponse.json({ imported, skipped, errors, details });
  },
);
