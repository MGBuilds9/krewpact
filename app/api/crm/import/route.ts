import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { findAccountDuplicates } from '@/lib/crm/duplicate-detector';
import {
  mapCompanyCodeToDivision,
  parseProjectSummary,
  buildAddressObject,
  splitContactName,
} from '@/lib/crm/excel-import';

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

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { entity_type, rows, column_mapping } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  if (entity_type === 'account') {
    return handleAccountImport(supabase, rows, column_mapping);
  }

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    // Apply column mapping
    const mapped: Record<string, unknown> = {};
    if (column_mapping) {
      for (const [csvCol, dbCol] of Object.entries(column_mapping)) {
        mapped[dbCol] = raw[csvCol];
      }
    } else {
      Object.assign(mapped, raw);
    }

    if (entity_type === 'lead') {
      const validated = importRowSchema.safeParse(mapped);
      if (!validated.success) {
        results.skipped++;
        results.errors.push(
          `Row ${i + 1}: ${validated.error.issues[0]?.message ?? 'Invalid data'}`,
        );
        continue;
      }

      const { error } = await supabase.from('leads').insert({
        ...validated.data,
        status: 'new',
      });

      if (error) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      } else {
        results.imported++;
      }
    } else {
      // Contact import
      const { error } = await supabase.from('contacts').insert(mapped);
      if (error) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      } else {
        results.imported++;
      }
    }
  }

  return NextResponse.json({ data: results });
}

// =====================================================
// Account import handler
// =====================================================

async function handleAccountImport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rows: Array<Record<string, unknown>>,
  column_mapping: Record<string, string> | undefined,
): Promise<NextResponse> {
  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
    accounts_created: [] as string[],
    projects_created: 0,
    contacts_created: 0,
  };

  // Pre-fetch all existing accounts for duplicate detection (batch lookup)
  const { data: existingAccounts, error: fetchError } = await supabase
    .from('accounts')
    .select('id, account_name')
    .is('deleted_at', null)
    .limit(2000);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Pre-fetch divisions for code → UUID resolution
  const { data: divisions, error: divError } = await supabase
    .from('divisions')
    .select('id, code');

  if (divError) {
    return NextResponse.json({ error: divError.message }, { status: 500 });
  }

  const divisionCodeMap = new Map<string, string>(
    (divisions ?? []).map((d: { id: string; code: string }) => [d.code, d.id]),
  );

  const accountPool: Array<Record<string, unknown>> = existingAccounts ?? [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];

    // Apply column mapping
    const mapped: Record<string, unknown> = {};
    if (column_mapping) {
      for (const [csvCol, dbCol] of Object.entries(column_mapping)) {
        mapped[dbCol] = raw[csvCol];
      }
    } else {
      Object.assign(mapped, raw);
    }

    const validated = accountImportRowSchema.safeParse(mapped);
    if (!validated.success) {
      results.skipped++;
      results.errors.push(
        `Row ${i + 1}: ${validated.error.issues[0]?.message ?? 'Invalid data'}`,
      );
      continue;
    }

    const row = validated.data;

    // Duplicate check
    const dupCheck = findAccountDuplicates(
      { account_name: row.company_name },
      accountPool,
    );
    if (dupCheck.hasDuplicates) {
      results.skipped++;
      results.errors.push(
        `Row ${i + 1}: Duplicate of "${dupCheck.matches[0]?.matchedValue}" (similarity ${(dupCheck.matches[0]?.similarity ?? 0).toFixed(2)})`,
      );
      continue;
    }

    // Resolve division UUID from company code
    const divisionCode = mapCompanyCodeToDivision(row.company_code);
    const divisionId = divisionCodeMap.get(divisionCode) ?? null;

    // Build address JSONB
    const addressObj = buildAddressObject({
      address: row.address,
      city: row.city,
      province: row.province,
      postal_code: row.postal_code,
    });

    // Insert account
    const { data: newAccount, error: insertError } = await supabase
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

    if (insertError || !newAccount) {
      results.skipped++;
      results.errors.push(`Row ${i + 1}: ${insertError?.message ?? 'Insert failed'}`);
      continue;
    }

    const accountId: string = newAccount.id;
    results.imported++;
    results.accounts_created.push(accountId);

    // Add newly created account to pool so subsequent rows can deduplicate against it
    accountPool.push({ id: accountId, account_name: row.company_name });

    // Parse and insert project history
    if (row.project_summary) {
      const projects = parseProjectSummary(row.project_summary);
      for (const proj of projects) {
        const { error: projError } = await supabase
          .from('client_project_history')
          .insert({
            account_id: accountId,
            project_number: proj.project_number,
            project_name: proj.project_name,
            source: 'import',
          });
        if (!projError) {
          results.projects_created++;
        }
      }
    }

    // Create contact record if contact_name is provided
    if (row.contact_name) {
      const { first_name, last_name } = splitContactName(row.contact_name);
      const { error: contactError } = await supabase.from('contacts').insert({
        first_name,
        last_name: last_name || null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        account_id: accountId,
      });
      if (!contactError) {
        results.contacts_created++;
      }
    }
  }

  // Recompute stats for all created accounts (fire in sequence to avoid overloading)
  for (const accountId of results.accounts_created) {
    await supabase.rpc('recompute_account_stats', { p_account_id: accountId });
  }

  return NextResponse.json({ data: results });
}
