import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { findAccountDuplicates } from '@/lib/crm/duplicate-detector';
import {
  buildAddressObject,
  mapCompanyCodeToDivision,
  parseProjectSummary,
  splitContactName,
} from '@/lib/crm/excel-import';
import { createUserClientSafe } from '@/lib/supabase/server';

const importRowSchema = z.object({
  company_name: z.string().min(1),
  stage: z.string().optional(),
  source_channel: z.string().optional(),
  estimated_value: z.number().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const accountImportRowSchema = z.object({
  client_id: z.string().optional().nullable(),
  company_code: z.string().optional().nullable(),
  company_name: z.string().min(1),
  contact_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  total_projects: z.number().optional().nullable(),
  project_summary: z.string().optional().nullable(),
});

const importSchema = z.object({
  entity_type: z.enum(['lead', 'contact', 'account']),
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(1000),
  column_mapping: z.record(z.string(), z.string()).optional(),
});

type AccountRow = z.infer<typeof accountImportRowSchema>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface AccountResults {
  imported: number;
  skipped: number;
  errors: string[];
  accounts_created: string[];
  projects_created: number;
  contacts_created: number;
}

interface ProcessAccountParams {
  supabase: SupabaseAny;
  row: AccountRow;
  divisionCodeMap: Map<string, string>;
  accountPool: Array<Record<string, unknown>>;
  results: AccountResults;
  rowIndex: number;
}

function applyColumnMapping(
  raw: Record<string, unknown>,
  column_mapping: Record<string, string> | undefined,
): Record<string, unknown> {
  if (!column_mapping) return { ...raw };
  const mapped: Record<string, unknown> = {};
  for (const [csvCol, dbCol] of Object.entries(column_mapping)) {
    mapped[dbCol] = raw[csvCol];
  }
  return mapped;
}

async function insertAccountProjectHistory(
  supabase: SupabaseAny,
  accountId: string,
  projectSummary: string,
): Promise<number> {
  const projects = parseProjectSummary(projectSummary);
  let count = 0;
  for (const proj of projects) {
    const { error } = await supabase.from('client_project_history').insert({
      account_id: accountId,
      project_number: proj.project_number,
      project_name: proj.project_name,
      source: 'import',
    });
    if (!error) count++;
  }
  return count;
}

async function insertAccountContact(
  supabase: SupabaseAny,
  accountId: string,
  row: AccountRow,
): Promise<boolean> {
  if (!row.contact_name) return false;
  const { first_name, last_name } = splitContactName(row.contact_name);
  const { error } = await supabase.from('contacts').insert({
    first_name,
    last_name: last_name || null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    account_id: accountId,
  });
  return !error;
}

async function insertAccountRecord(
  supabase: SupabaseAny,
  row: AccountRow,
  divisionCodeMap: Map<string, string>,
): Promise<string | null> {
  const divisionId = divisionCodeMap.get(mapCompanyCodeToDivision(row.company_code)) ?? null;
  const addressObj = buildAddressObject({
    address: row.address,
    city: row.city,
    province: row.province,
    postal_code: row.postal_code,
  });
  const { data: newAccount, error } = await supabase
    .from('accounts')
    .insert({
      account_name: row.company_name,
      company_code: row.company_code ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      address: addressObj,
      source: 'import',
      division_id: divisionId,
      metadata: row.client_id ? { client_id: row.client_id } : {},
    })
    .select('id')
    .single();
  if (error || !newAccount) return null;
  return newAccount.id as string;
}

async function processAccountRow(params: ProcessAccountParams): Promise<void> {
  const { supabase, row, divisionCodeMap, accountPool, results, rowIndex } = params;
  const dupCheck = findAccountDuplicates({ account_name: row.company_name }, accountPool);
  if (dupCheck.hasDuplicates) {
    results.skipped++;
    results.errors.push(
      `Row ${rowIndex}: Duplicate of "${dupCheck.matches[0]?.matchedValue}" (similarity ${(dupCheck.matches[0]?.similarity ?? 0).toFixed(2)})`,
    );
    return;
  }

  const accountId = await insertAccountRecord(supabase, row, divisionCodeMap);
  if (!accountId) {
    results.skipped++;
    results.errors.push(`Row ${rowIndex}: Insert failed`);
    return;
  }

  results.imported++;
  results.accounts_created.push(accountId);
  accountPool.push({ id: accountId, account_name: row.company_name });

  if (row.project_summary) {
    results.projects_created += await insertAccountProjectHistory(
      supabase,
      accountId,
      row.project_summary,
    );
  }
  if (await insertAccountContact(supabase, accountId, row)) {
    results.contacts_created++;
  }
}

async function handleAccountImport(
  supabase: SupabaseAny,
  rows: Array<Record<string, unknown>>,
  column_mapping: Record<string, string> | undefined,
): Promise<NextResponse> {
  const results: AccountResults = {
    imported: 0,
    skipped: 0,
    errors: [],
    accounts_created: [],
    projects_created: 0,
    contacts_created: 0,
  };

  const [{ data: existingAccounts, error: fetchError }, { data: divisions, error: divError }] =
    await Promise.all([
      supabase.from('accounts').select('id, account_name').is('deleted_at', null).limit(2000),
      supabase.from('divisions').select('id, code'),
    ]);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (divError) return NextResponse.json({ error: divError.message }, { status: 500 });

  const divisionCodeMap = new Map<string, string>(
    (divisions ?? []).map((d: { id: string; code: string }) => [d.code, d.id]),
  );
  const accountPool: Array<Record<string, unknown>> = existingAccounts ?? [];

  for (let i = 0; i < rows.length; i++) {
    const mapped = applyColumnMapping(rows[i], column_mapping);
    const validated = accountImportRowSchema.safeParse(mapped);
    if (!validated.success) {
      results.skipped++;
      results.errors.push(`Row ${i + 1}: ${validated.error.issues[0]?.message ?? 'Invalid data'}`);
      continue;
    }
    await processAccountRow({
      supabase,
      row: validated.data,
      divisionCodeMap,
      accountPool,
      results,
      rowIndex: i + 1,
    });
  }

  for (const accountId of results.accounts_created) {
    await supabase.rpc('recompute_account_stats', { p_account_id: accountId });
  }

  return NextResponse.json({ data: results });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { entity_type, rows, column_mapping } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  if (entity_type === 'account') return handleAccountImport(supabase, rows, column_mapping);

  const results = { imported: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const mapped = applyColumnMapping(rows[i], column_mapping);

    if (entity_type === 'lead') {
      const validated = importRowSchema.safeParse(mapped);
      if (!validated.success) {
        results.skipped++;
        results.errors.push(
          `Row ${i + 1}: ${validated.error.issues[0]?.message ?? 'Invalid data'}`,
        );
        continue;
      }
      const { error } = await supabase.from('leads').insert({ ...validated.data, status: 'new' });
      if (error) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      } else results.imported++;
    } else {
      const { error } = await supabase.from('contacts').insert(mapped);
      if (error) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      } else results.imported++;
    }
  }

  return NextResponse.json({ data: results });
}
