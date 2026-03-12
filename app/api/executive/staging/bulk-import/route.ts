import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { stagingBulkImportSchema } from '@/lib/validators/executive';
import { readFile, stat } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { getKrewpactRoles, getOrgIdFromAuth } from '@/lib/api/org';

const ADMIN_ROLES = ['platform_admin'];

interface FileDetail {
  path: string;
  status: 'imported' | 'skipped' | 'error';
  reason?: string;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => ADMIN_ROLES.includes(r));
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: platform_admin role required' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 5, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = stagingBulkImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const orgId = await getOrgIdFromAuth();
  const supabase = await createServiceClient();

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const details: FileDetail[] = [];

  for (const file of parsed.data.files) {
    const filePath = file.path;

    // 1. Check file exists and is a regular file
    let isFile = false;
    try {
      const fileStats = await stat(filePath);
      isFile = fileStats.isFile();
    } catch {
      errors++;
      details.push({ path: filePath, status: 'error', reason: 'File not found or inaccessible' });
      continue;
    }

    if (!isFile) {
      errors++;
      details.push({ path: filePath, status: 'error', reason: 'Path is not a file' });
      continue;
    }

    // 2. Read content
    let rawContent: string;
    try {
      rawContent = await readFile(filePath, 'utf-8');
    } catch {
      errors++;
      details.push({ path: filePath, status: 'error', reason: 'Failed to read file' });
      continue;
    }

    // 3. Skip empty files
    if (!rawContent.trim()) {
      skipped++;
      details.push({ path: filePath, status: 'skipped', reason: 'File is empty' });
      continue;
    }

    // 4. Extract title from first # heading or fall back to filename
    const headingMatch = rawContent.match(/^#\s+(.+)$/m);
    const title = headingMatch
      ? headingMatch[1].trim()
      : path.basename(filePath, path.extname(filePath));

    // 5. Compute SHA-256 checksum of raw content
    const contentChecksum = createHash('sha256').update(rawContent).digest('hex');

    // 6. Check for existing staging doc with same checksum + org_id (dedup)
    const { data: existing } = await supabase
      .from('knowledge_staging')
      .select('id')
      .eq('org_id', orgId)
      .eq('content_checksum', contentChecksum);

    if (existing && existing.length > 0) {
      skipped++;
      details.push({ path: filePath, status: 'skipped', reason: 'duplicate checksum' });
      continue;
    }

    // 7. Strip YAML frontmatter before storing
    const strippedContent = rawContent.replace(/^---[\s\S]*?---\n*/m, '');

    // 8. Insert into knowledge_staging
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

    if (insertError) {
      errors++;
      details.push({ path: filePath, status: 'error', reason: 'Database insert failed' });
      continue;
    }

    imported++;
    details.push({ path: filePath, status: 'imported' });
  }

  return NextResponse.json({ imported, skipped, errors, details });
}
