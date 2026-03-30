/**
 * ADP Field Test — Readiness Check Script
 *
 * Validates data prerequisites for the ADP CSV export pipeline and generates
 * a sample acknowledgment CSV for reconciliation testing.
 *
 * Usage: npx tsx scripts/adp-field-test.ts
 */

import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

// ─── Env Validation ──────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '❌  Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(label: string, width = 36): string {
  return label.padEnd(width, '.');
}

function statusIcon(ok: boolean): string {
  return ok ? '✓' : '✗';
}

// ─── Check Functions ─────────────────────────────────────────────────────────

interface CheckResult {
  label: string;
  passed: boolean;
  detail: string;
}

async function checkRecentTimeEntries(): Promise<CheckResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const { count, error } = await supabase
    .from('time_entries')
    .select('id', { count: 'exact', head: true })
    .gte('work_date', cutoff.toISOString().slice(0, 10));

  if (error) {
    return { label: 'Recent time_entries (last 30 days)', passed: false, detail: error.message };
  }

  const n = count ?? 0;
  return {
    label: 'Recent time_entries (last 30 days)',
    passed: n > 0,
    detail: `${n} entr${n === 1 ? 'y' : 'ies'} found`,
  };
}

async function checkDivisions(): Promise<CheckResult> {
  const { data, error } = await supabase
    .from('divisions')
    .select('id, name')
    .not('name', 'is', null)
    .limit(10);

  if (error) {
    return { label: 'Divisions with names', passed: false, detail: error.message };
  }

  const n = data?.length ?? 0;
  const names = data?.map((d) => d.name).join(', ') ?? '';
  return {
    label: 'Divisions with names',
    passed: n > 0,
    detail: `${n} found: ${names || '(none)'}`,
  };
}

interface UserAdpStats {
  total: number;
  withCode: number;
  withoutCode: number;
  sampleWithCode: string[];
  sampleWithoutCode: string[];
}

async function checkUsersAdpCode(): Promise<CheckResult & { stats: UserAdpStats }> {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, adp_employee_code')
    .limit(200);

  if (error) {
    return {
      label: 'Users — adp_employee_code coverage',
      passed: false,
      detail: error.message,
      stats: { total: 0, withCode: 0, withoutCode: 0, sampleWithCode: [], sampleWithoutCode: [] },
    };
  }

  const users = data ?? [];
  const withCode = users.filter((u) => u.adp_employee_code);
  const withoutCode = users.filter((u) => !u.adp_employee_code);

  const fmt = (u: (typeof users)[number]) =>
    `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.id;

  return {
    label: 'Users — adp_employee_code coverage',
    passed: users.length > 0,
    detail: `${users.length} users total — ${withCode.length} with ADP code, ${withoutCode.length} without`,
    stats: {
      total: users.length,
      withCode: withCode.length,
      withoutCode: withoutCode.length,
      sampleWithCode: withCode.slice(0, 3).map(fmt),
      sampleWithoutCode: withoutCode.slice(0, 3).map(fmt),
    },
  };
}

// ─── Sample CSV Generator ────────────────────────────────────────────────────

/**
 * Generates a sample ADP acknowledgment CSV for reconciliation testing.
 * Includes a "Smith, John" quoted-comma row to exercise the RFC 4180 parser.
 */
function generateSampleAckCsv(): string {
  const rows = [
    ['Employee ID', 'Employee Name', 'Hours - Regular', 'Hours - Overtime', 'Status'],
    ['ADP-0001', 'Johnson, Michael', '40.00', '2.50', 'PROCESSED'],
    // RFC 4180 quoted-comma test case: last name contains comma
    ['ADP-0002', '"Smith, John"', '37.50', '0.00', 'PROCESSED'],
    ['ADP-0003', 'Patel, Priya', '40.00', '5.00', 'PROCESSED'],
    ['ADP-0004', 'Leblanc, Marc', '32.00', '0.00', 'PROCESSED'],
    ['ADP-XXXX', 'Ghost, Employee', '40.00', '0.00', 'PROCESSED'], // missing in export — should trigger missing_in_export
  ];

  return rows.map((row) => row.join(',')).join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  KrewPact — ADP CSV Pipeline Readiness Check');
  console.log('═══════════════════════════════════════════════════\n');

  // Run checks in parallel
  const [timeCheck, divisionCheck, userCheck] = await Promise.all([
    checkRecentTimeEntries(),
    checkDivisions(),
    checkUsersAdpCode(),
  ]);

  const checks: CheckResult[] = [timeCheck, divisionCheck, userCheck];

  // Print check results
  console.log('DATA READINESS\n');
  for (const check of checks) {
    console.log(`  ${statusIcon(check.passed)} ${pad(check.label)} ${check.detail}`);
  }

  // Print ADP code coverage breakdown
  console.log('\nADP EMPLOYEE CODE BREAKDOWN\n');
  const stats = userCheck.stats;
  if (stats.total > 0) {
    const pct = ((stats.withCode / stats.total) * 100).toFixed(1);
    console.log(`  Coverage : ${stats.withCode}/${stats.total} users (${pct}%)`);

    if (stats.sampleWithCode.length > 0) {
      console.log(`  With code   : ${stats.sampleWithCode.join(', ')}`);
    }
    if (stats.sampleWithoutCode.length > 0) {
      console.log(
        `  Without code: ${stats.sampleWithoutCode.join(', ')} (will use UUID in export)`,
      );
    }

    if (stats.withCode === 0) {
      console.log('\n  ⚠  No users have adp_employee_code set.');
      console.log(
        '     ADP export will fall back to internal UUIDs — ADP will reject the file.',
      );
      console.log(
        '     Run: UPDATE users SET adp_employee_code = <code> WHERE id = <id>;',
      );
    } else if (stats.withoutCode > 0) {
      console.log(`\n  ⚠  ${stats.withoutCode} users lack ADP codes — their rows will use UUIDs.`);
    }
  } else {
    console.log('  No users found in the database.');
  }

  // Generate + print sample ack CSV
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SAMPLE ADP ACKNOWLEDGMENT CSV (reconciliation test)');
  console.log('═══════════════════════════════════════════════════\n');

  const csv = generateSampleAckCsv();
  console.log(csv);

  console.log('\n  Notes on the sample CSV:');
  console.log('  • "Smith, John" row uses RFC 4180 quoted field — parser must handle comma-in-name');
  console.log('  • ADP-XXXX is intentionally missing from the export — should flag missing_in_export');
  console.log('  • To test: POST this CSV to /api/payroll/reconcile with a matching export batch ID');

  // Overall readiness
  const allPassed = checks.every((c) => c.passed);
  const passCount = checks.filter((c) => c.passed).length;

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  READINESS: ${passCount}/${checks.length} checks passed`);
  console.log('═══════════════════════════════════════════════════\n');

  // Next steps
  console.log('NEXT STEPS FOR OPERATOR\n');

  if (!timeCheck.passed) {
    console.log('  1. Seed time_entries: run npm run seed:test-users then add time entries via UI');
    console.log('     or INSERT directly for the last 30 days.\n');
  }

  if (!divisionCheck.passed) {
    console.log('  2. Seed divisions: run npm run seed:org to create default MDM divisions.\n');
  }

  if (stats.withCode === 0 && stats.total > 0) {
    console.log(
      '  3. Set adp_employee_code on users before running a live export.',
    );
    console.log(
      '     Format: "ADP-NNNN" (matches ADP Workforce Now employee IDs).\n',
    );
  }

  if (allPassed) {
    console.log('  All checks passed. To run a live export:');
    console.log('  POST /api/payroll/export');
    console.log('  Body: { "periodStart": "2026-03-01", "periodEnd": "2026-03-31",');
    console.log('          "divisionIds": ["<uuid>", ...] }');
    console.log('\n  Then reconcile:');
    console.log('  POST /api/payroll/reconcile');
    console.log('  Body: { "exportBatchId": "<uuid>", "ackCsv": "<csv string>" }');
  }

  console.log('');
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
