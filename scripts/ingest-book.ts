import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import matter from 'gray-matter';
import OpenAI from 'openai';
import path from 'path';

// Configuration
const BOOK_REL_PATH = '../MDM-Book-Internal';
// Whitelisted top-level directories only
const TARGET_DIRS = ['01-company', '02-market', '03-competitors', '04-strategy', '05-operations'];
// 07-sensitive is explicitly EXCLUDED by omission

// Scripts don't have generated Supabase types — use a permissive client type
type SupabaseClient = ReturnType<typeof createClient<any, any, any>>;

interface Manifest {
  ingested: string[];
  skipped_sensitive: string[];
  skipped_other: string[];
}

async function embedAndStoreChunks(
  supabase: SupabaseClient,
  openai: OpenAI,
  docId: string,
  body: string,
): Promise<void> {
  const chunks = splitIntoChunks(body, 1500);
  await supabase.from('knowledge_embeddings').delete().eq('doc_id', docId);

  const embeddingsToInsert = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.trim()) continue;

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: chunk.replace(/\n/g, ' '),
    });

    embeddingsToInsert.push({
      doc_id: docId,
      chunk_index: i,
      content: chunk,
      embedding: embeddingResponse.data[0].embedding,
    });
  }

  const { error: embedError } = await supabase.from('knowledge_embeddings').insert(embeddingsToInsert);
  if (embedError) console.error(embedError);
  else process.stdout.write('✓');
}

interface UpsertDocOptions {
  supabase: SupabaseClient;
  openai: OpenAI;
  relPath: string;
  dir: string;
  body: string;
  title: string;
  checksum: string;
}

async function upsertDoc(opts: UpsertDocOptions): Promise<void> {
  const { supabase, openai, relPath, dir, body, title, checksum } = opts;

  const { data: existing } = await supabase
    .from('knowledge_docs')
    .select('id, checksum')
    .eq('file_path', relPath)
    .single();

  if (existing && existing.checksum === checksum) {
    process.stdout.write('.');
    return;
  }

  const { data: doc, error: docError } = await supabase
    .from('knowledge_docs')
    .upsert(
      {
        file_path: relPath,
        title,
        category: dir.split('-')[1] || 'general',
        checksum,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'file_path' },
    )
    .select()
    .single();

  if (docError) {
    console.error(`\n❌ Error storing doc ${relPath}:`, docError.message);
    return;
  }

  await embedAndStoreChunks(supabase, openai, doc.id, body);
}

function printManifest(manifest: Manifest, totalDocs: number, sensitiveDocs: number): void {
  console.log('\n\n==================================================');
  console.log('🔍 SCAN MANIFEST');
  console.log('==================================================');

  if (manifest.skipped_sensitive.length > 0) {
    console.log('\n🚫 SKIPPED (SENSITIVE FLAG):');
    manifest.skipped_sensitive.forEach((f) => console.log(`   - ${f}`));
  }

  console.log(`\n✅ TO BE INGESTED (${manifest.ingested.length} files):`);
  const byFolder = Object.groupBy(manifest.ingested, (f) => f.split(path.sep)[0]);
  for (const [folder, files] of Object.entries(byFolder)) {
    console.log(`\n   📂 ${folder} (${files?.length})`);
    files?.slice(0, 5).forEach((f) => console.log(`      - ${path.basename(f)}`));
    if (files && files.length > 5) console.log(`      ... and ${files.length - 5} more`);
  }

  console.log('\n--------------------------------------------------');
  console.log(`Summary: ${totalDocs} candidate files. ${sensitiveDocs} sensitive skipped.`);
  console.log('--------------------------------------------------');
}

interface ProcessFileOptions {
  filePath: string;
  bookPath: string;
  dir: string;
  isDryRun: boolean;
  supabase: SupabaseClient | undefined;
  openai: OpenAI | undefined;
  manifest: Manifest;
}

async function processFile(opts: ProcessFileOptions): Promise<{ ingested: boolean; sensitive: boolean }> {
  const { filePath, bookPath, dir, isDryRun, supabase, openai, manifest } = opts;
  const relPath = path.relative(bookPath, filePath);
  const content = await fs.readFile(filePath, 'utf-8');
  const { data: metadata, content: body } = matter(content);

  if (metadata.sensitive === true || metadata.private === true) {
    manifest.skipped_sensitive.push(relPath);
    return { ingested: false, sensitive: true };
  }

  if (path.basename(filePath).startsWith('.')) {
    manifest.skipped_other.push(relPath);
    return { ingested: false, sensitive: false };
  }

  manifest.ingested.push(relPath);

  if (!isDryRun && supabase && openai) {
    const title = (metadata.title as string | undefined) || path.basename(filePath, '.md').replace(/-/g, ' ');
    const checksum = Buffer.from(body).toString('base64').slice(0, 32);
    await upsertDoc({ supabase, openai, relPath, dir, body, title, checksum });
  }

  return { ingested: true, sensitive: false };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`📚 MDM-Book Ingestion Tool ${isDryRun ? '(DRY RUN MODE)' : ''}`);
  console.log('--------------------------------------------------');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  let supabase: SupabaseClient | undefined;
  let openai: OpenAI | undefined;

  if (!isDryRun) {
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
      process.exit(1);
    }
    if (!openaiKey) {
      console.error('❌ Missing OPENAI_API_KEY');
      process.exit(1);
    }
    supabase = createClient(supabaseUrl, supabaseKey);
    openai = new OpenAI({ apiKey: openaiKey });
  } else {
    console.log('ℹ️  Running without API keys (Dry Run)');
  }

  const bookPath = path.resolve(process.cwd(), BOOK_REL_PATH);
  console.log(`📂 Scanning: ${bookPath}`);

  try {
    await fs.access(bookPath);
  } catch {
    console.error(`❌ MDM-Book directory not found at ${bookPath}`);
    process.exit(1);
  }

  let totalDocs = 0;
  let sensitiveDocs = 0;
  const manifest: Manifest = { ingested: [], skipped_sensitive: [], skipped_other: [] };

  for (const dir of TARGET_DIRS) {
    const dirPath = path.join(bookPath, dir);
    try {
      await fs.access(dirPath);
    } catch {
      console.warn(`⚠️  Skipping missing directory: ${dir}`);
      continue;
    }

    const files = await getMarkdownFiles(dirPath);
    for (const filePath of files) {
      const result = await processFile({ filePath, bookPath, dir, isDryRun, supabase, openai, manifest });
      if (result.ingested) totalDocs++;
      if (result.sensitive) sensitiveDocs++;
    }
  }

  printManifest(manifest, totalDocs, sensitiveDocs);

  if (isDryRun) {
    console.log('\nℹ️  This was a DRY RUN. No data was sent to OpenAI or Supabase.');
    console.log('   To execute: provide API keys and run without --dry-run');
  }
}

// Helpers
async function getMarkdownFiles(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getMarkdownFiles(res) : res;
    }),
  );
  return Array.prototype.concat(...files).filter((f) => f.endsWith('.md'));
}

function splitIntoChunks(text: string, maxLength: number): string[] {
  const chunks = [];
  let currentChunk = '';
  const lines = text.split('\n');
  for (const line of lines) {
    if ((currentChunk + line).length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += line + '\n';
  }
  if (currentChunk.trim()) chunks.push(currentChunk);
  return chunks;
}

main().catch(console.error);
