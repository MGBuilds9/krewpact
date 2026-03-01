import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import 'dotenv/config';

// Configuration
const BOOK_REL_PATH = '../MDM-Book-Internal';
// Whitelisted top-level directories only
const TARGET_DIRS = [
  '01-company',
  '02-market',
  '03-competitors',
  '04-strategy',
  '05-operations'
];
// 07-sensitive is explicitly EXCLUDED by omission

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`📚 MDM-Book Ingestion Tool ${isDryRun ? '(DRY RUN MODE)' : ''}`);
  console.log('--------------------------------------------------');

  // 1. Setup Clients (Skip in Dry Run if missing)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  let supabase, openai;

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

  // 2. Resolve Paths
  const bookPath = path.resolve(process.cwd(), BOOK_REL_PATH);
  console.log(`📂 Scanning: ${bookPath}`);

  try {
    await fs.access(bookPath);
  } catch {
    console.error(`❌ MDM-Book directory not found at ${bookPath}`);
    process.exit(1);
  }

  // 3. Scan & Process
  let totalDocs = 0;
  let skippedDocs = 0;
  let sensitiveDocs = 0;

  const manifest = {
    ingested: [] as string[],
    skipped_sensitive: [] as string[],
    skipped_other: [] as string[]
  };

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
      const relPath = path.relative(bookPath, filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse Frontmatter
      const { data: metadata, content: body } = matter(content);

      // Check Sensitivity
      if (metadata.sensitive === true || metadata.private === true) {
        manifest.skipped_sensitive.push(relPath);
        sensitiveDocs++;
        continue;
      }

      // Check Ignore (e.g. if file starts with .)
      if (path.basename(filePath).startsWith('.')) {
        manifest.skipped_other.push(relPath);
        skippedDocs++;
        continue;
      }

      manifest.ingested.push(relPath);
      totalDocs++;

      if (isDryRun) {
        // Just verify scanning works
        continue;
      }

      // ... (Real ingestion logic skipped in dry run) ...
      const title = metadata.title || path.basename(filePath, '.md').replace(/-/g, ' ');
      const checksum = Buffer.from(body).toString('base64').slice(0, 32);

      // Check existence
      const { data: existing } = await supabase!
        .from('knowledge_docs')
        .select('id, checksum')
        .eq('file_path', relPath)
        .single();

      if (existing && existing.checksum === checksum) {
        process.stdout.write('.');
        continue;
      }

      // Upsert
      const { data: doc, error: docError } = await supabase!
        .from('knowledge_docs')
        .upsert({
          file_path: relPath,
          title: title,
          category: dir.split('-')[1] || 'general',
          checksum,
          last_synced_at: new Date().toISOString()
        }, { onConflict: 'file_path' })
        .select()
        .single();

      if (docError) {
        console.error(`\n❌ Error storing doc ${relPath}:`, docError.message);
        continue;
      }

      // Embed
      const chunks = splitIntoChunks(body, 1500);
      await supabase!.from('knowledge_embeddings').delete().eq('doc_id', doc.id);

      const embeddingsToInsert = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk.trim()) continue;

        const embeddingResponse = await openai!.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunk.replace(/\n/g, ' ')
        });

        embeddingsToInsert.push({
          doc_id: doc.id,
          chunk_index: i,
          content: chunk,
          embedding: embeddingResponse.data[0].embedding
        });
      }

      const { error: embedError } = await supabase!
        .from('knowledge_embeddings')
        .insert(embeddingsToInsert);

      if (embedError) console.error(embedError);
      else process.stdout.write('✓');
    }
  }

  // Report
  console.log('\n\n==================================================');
  console.log('🔍 SCAN MANIFEST');
  console.log('==================================================');

  if (manifest.skipped_sensitive.length > 0) {
    console.log('\n🚫 SKIPPED (SENSITIVE FLAG):');
    manifest.skipped_sensitive.forEach(f => console.log(`   - ${f}`));
  }

  console.log(`\n✅ TO BE INGESTED (${manifest.ingested.length} files):`);
  // Group by folder for readability
  const byFolder = Object.groupBy(manifest.ingested, (f) => f.split(path.sep)[0]);
  for (const [folder, files] of Object.entries(byFolder)) {
    console.log(`\n   📂 ${folder} (${files?.length})`);
    files?.slice(0, 5).forEach(f => console.log(`      - ${path.basename(f)}`));
    if (files && files.length > 5) console.log(`      ... and ${files.length - 5} more`);
  }

  console.log('\n--------------------------------------------------');
  console.log(`Summary: ${totalDocs} candidate files. ${sensitiveDocs} sensitive skipped.`);
  console.log('--------------------------------------------------');

  if (isDryRun) {
    console.log('\nℹ️  This was a DRY RUN. No data was sent to OpenAI or Supabase.');
    console.log('   To execute: provide API keys and run without --dry-run');
  }
}

// Helpers
async function getMarkdownFiles(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getMarkdownFiles(res) : res;
  }));
  return Array.prototype.concat(...files).filter(f => f.endsWith('.md'));
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
