/**
 * KrewPact Health Check Script
 *
 * Tests connectivity to every external service KrewPact depends on.
 * Prints a pass/fail status line for each service and a final summary.
 *
 * Usage: npx tsx scripts/health-check.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

// ── ANSI colour helpers ──────────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const CHECK = `${GREEN}✓${RESET}`;
const CROSS = `${RED}✗${RESET}`;

// ── Result tracking ──────────────────────────────────────────────────────────
interface CheckResult {
  name: string;
  passed: boolean;
  note?: string;
}

const results: CheckResult[] = [];

function pass(name: string, note?: string) {
  const msg = note ? ` ${YELLOW}(${note})${RESET}` : '';
  console.log(`  ${CHECK}  ${BOLD}${name}${RESET}${msg}`);
  results.push({ name, passed: true, note });
}

function fail(name: string, reason: string) {
  console.log(`  ${CROSS}  ${BOLD}${name}${RESET}  ${RED}${reason}${RESET}`);
  results.push({ name, passed: false, note: reason });
}

// ── Env var helpers ──────────────────────────────────────────────────────────
function env(key: string): string {
  return process.env[key] ?? '';
}

function requireEnv(key: string, serviceName: string): string | null {
  const value = env(key);
  if (!value) {
    fail(serviceName, `Missing env var: ${key}`);
    return null;
  }
  return value;
}

// ── Fetch with timeout ───────────────────────────────────────────────────────
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Deep check flag ─────────────────────────────────────────────────────────
const DEEP = process.argv.includes('--deep');

// ── Individual service checks ────────────────────────────────────────────────

async function checkSupabaseRest() {
  const name = 'Supabase REST API (anon)';
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL', name);
  const key = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', name);
  if (!url || !key) return;

  try {
    const res = await fetchWithTimeout(`${url}/rest/v1/`, {
      headers: { apikey: key },
    });
    if (res.ok) {
      pass(name, `HTTP ${res.status}`);
    } else {
      fail(name, `HTTP ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    fail(name, String(err));
  }

  // Deep: verify RLS blocks anon from reading leads
  if (DEEP) {
    const rlsName = 'Supabase RLS (anon blocked)';
    try {
      const res = await fetchWithTimeout(`${url}/rest/v1/leads?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      // Anon should get 0 rows or a 4xx — NOT full data
      if (res.status === 401 || res.status === 403) {
        pass(rlsName, `Blocked with ${res.status}`);
      } else if (res.ok) {
        const body = (await res.json()) as unknown[];
        if (body.length === 0) {
          pass(rlsName, 'RLS returned 0 rows (correct)');
        } else {
          fail(rlsName, `Anon got ${body.length} row(s) — RLS may be misconfigured`);
        }
      } else {
        pass(rlsName, `Blocked with ${res.status}`);
      }
    } catch (err) {
      fail(rlsName, String(err));
    }
  }
}

async function checkSupabaseTableCount(url: string, key: string, table: string): Promise<void> {
  const checkName = `Supabase Data (${table})`;
  try {
    const res = await fetchWithTimeout(`${url}/rest/v1/${table}?select=count`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
    });
    if (res.ok) {
      const count = res.headers.get('content-range')?.split('/')?.[1] ?? '?';
      if (count !== '0' && count !== '?') {
        pass(checkName, `${count} rows`);
      } else {
        fail(checkName, `Table is empty (${count} rows)`);
      }
    } else {
      fail(checkName, `HTTP ${res.status}`);
    }
  } catch (err) {
    fail(checkName, String(err));
  }
}

async function checkSupabaseServiceRole() {
  const name = 'Supabase Service Role';
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL', name);
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY', name);
  if (!url || !key) return;

  try {
    const res = await fetchWithTimeout(`${url}/rest/v1/leads?select=count&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'count=exact',
      },
    });
    if (res.ok) {
      pass(name, `HTTP ${res.status}`);
    } else {
      const body = await res.text().catch(() => '');
      fail(name, `HTTP ${res.status} — ${body.slice(0, 120)}`);
    }
  } catch (err) {
    fail(name, String(err));
  }

  // Deep: verify data exists in key tables
  if (DEEP) {
    const tables = ['divisions', 'leads', 'projects'] as const;
    for (const table of tables) {
      await checkSupabaseTableCount(url, key, table);
    }
  }
}

async function checkClerkAuthMetadata(key: string): Promise<void> {
  const authBridgeName = 'Clerk Third-Party Auth Metadata';
  try {
    const usersRes = await fetchWithTimeout('https://api.clerk.com/v1/users?limit=10', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!usersRes.ok) {
      fail(authBridgeName, `HTTP ${usersRes.status}`);
      return;
    }
    const users = (await usersRes.json()) as Array<{
      public_metadata?: Record<string, unknown>;
    }>;
    const configuredUser = users.find((user) => {
      const meta = user.public_metadata ?? {};
      return (
        typeof meta.krewpact_user_id === 'string' &&
        Array.isArray(meta.role_keys) &&
        Array.isArray(meta.division_ids)
      );
    });
    if (configuredUser) {
      pass(authBridgeName, 'Found user metadata for Supabase session token claims');
    } else {
      fail(
        authBridgeName,
        'No Clerk user has krewpact_user_id + role_keys + division_ids in public metadata',
      );
    }
  } catch (err) {
    fail(authBridgeName, String(err));
  }
}

async function checkClerk() {
  const name = 'Clerk';
  const key = requireEnv('CLERK_SECRET_KEY', name);
  if (!key) return;

  try {
    const res = await fetchWithTimeout('https://api.clerk.com/v1/users?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      pass(name, `HTTP ${res.status}`);
      if (DEEP) {
        await checkClerkAuthMetadata(key);
      }
    } else {
      const body = await res.text().catch(() => '');
      fail(name, `HTTP ${res.status} — ${body.slice(0, 120)}`);
    }
  } catch (err) {
    fail(name, String(err));
  }
}

async function checkUpstashRedis() {
  const name = 'Upstash Redis';
  const url = requireEnv('UPSTASH_REDIS_REST_URL', name);
  const token = requireEnv('UPSTASH_REDIS_REST_TOKEN', name);
  if (!url || !token) return;

  try {
    const res = await fetchWithTimeout(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      fail(name, `HTTP ${res.status} ${res.statusText}`);
      return;
    }
    const body = await res.text();
    if (body.includes('PONG')) {
      pass(name, 'PONG received');
    } else {
      fail(name, `Unexpected response: ${body.slice(0, 80)}`);
    }
  } catch (err) {
    fail(name, String(err));
    return;
  }

  // Deep: SET → GET → DEL roundtrip
  if (DEEP) {
    const deepName = 'Upstash Redis (SET/GET/DEL)';
    const testKey = `krewpact:healthcheck:${Date.now()}`;
    const testVal = 'ok';
    try {
      // SET
      const setRes = await fetchWithTimeout(`${url}/set/${testKey}/${testVal}?EX=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!setRes.ok) {
        fail(deepName, `SET failed: HTTP ${setRes.status}`);
        return;
      }
      // GET
      const getRes = await fetchWithTimeout(`${url}/get/${testKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!getRes.ok) {
        fail(deepName, `GET failed: HTTP ${getRes.status}`);
        return;
      }
      const getData = (await getRes.json()) as { result: string | null };
      if (getData.result !== testVal) {
        fail(deepName, `GET returned "${getData.result}" instead of "${testVal}"`);
        return;
      }
      // DEL
      await fetchWithTimeout(`${url}/del/${testKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      pass(deepName, 'SET/GET/DEL roundtrip OK');
    } catch (err) {
      fail(deepName, String(err));
    }
  }
}

async function checkQStash() {
  const name = 'Upstash QStash';
  const token = requireEnv('QSTASH_TOKEN', name);
  if (!token) return;

  const signingCheckName = 'Upstash QStash Signing Keys';
  const currentSigningKey = env('QSTASH_CURRENT_SIGNING_KEY');
  const nextSigningKey = env('QSTASH_NEXT_SIGNING_KEY');
  if (currentSigningKey && nextSigningKey) {
    pass(signingCheckName, 'Current and next signing keys configured');
  } else {
    fail(signingCheckName, 'Missing QSTASH_CURRENT_SIGNING_KEY or QSTASH_NEXT_SIGNING_KEY');
  }

  try {
    // Use QSTASH_URL env if set (handles region routing), fallback to default
    const baseUrl = env('QSTASH_URL') || 'https://qstash.upstash.io';
    const res = await fetchWithTimeout(`${baseUrl}/v2/topics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      pass(name, `HTTP ${res.status}`);
    } else {
      const body = await res.text().catch(() => '');
      fail(name, `HTTP ${res.status} — ${body.slice(0, 120)}`);
    }
  } catch (err) {
    fail(name, String(err));
  }
}

async function checkERPNextCompanyDoctype(
  baseUrl: string,
  apiKey: string,
  apiSecret: string,
): Promise<void> {
  const deepName = 'ERPNext (Company doctype)';
  try {
    const companyRes = await fetchWithTimeout(
      `${baseUrl}/api/resource/Company?fields=["name"]&limit_page_length=5`,
      { headers: { Authorization: `token ${apiKey}:${apiSecret}` } },
      12_000,
    );
    if (!companyRes.ok) {
      fail(deepName, `HTTP ${companyRes.status}`);
      return;
    }
    const data = (await companyRes.json()) as { data?: Array<{ name: string }> };
    const count = data.data?.length ?? 0;
    if (count > 0) {
      pass(deepName, `${count} companies found`);
    } else {
      fail(deepName, 'Company list is empty');
    }
  } catch (err) {
    fail(deepName, String(err));
  }
}

function isNetworkError(msg: string): boolean {
  return (
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('AbortError') ||
    msg.includes('fetch failed')
  );
}

async function checkERPNext() {
  const name = 'ERPNext';
  const baseUrl = requireEnv('ERPNEXT_BASE_URL', name);
  const apiKey = requireEnv('ERPNEXT_API_KEY', name);
  const apiSecret = requireEnv('ERPNEXT_API_SECRET', name);
  if (!baseUrl || !apiKey || !apiSecret) return;

  const endpoint = `${baseUrl}/api/method/frappe.auth.get_logged_user`;
  try {
    const res = await fetchWithTimeout(
      endpoint,
      { headers: { Authorization: `token ${apiKey}:${apiSecret}` } },
      12_000, // slightly longer — Cloudflare Tunnel can be slow to wake
    );
    if (res.ok) {
      pass(name, `HTTP ${res.status}`);
      if (DEEP) {
        await checkERPNextCompanyDoctype(baseUrl, apiKey, apiSecret);
      }
    } else {
      const body = await res.text().catch(() => '');
      fail(name, `HTTP ${res.status} — ${body.slice(0, 120)}`);
    }
  } catch (err) {
    const msg = String(err);
    fail(name, isNetworkError(msg) ? `Tunnel appears down — ${msg}` : msg);
  }
}

async function checkResend() {
  const name = 'Resend';
  const key = requireEnv('RESEND_API_KEY', name);
  if (!key) return;

  try {
    const res = await fetchWithTimeout('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      pass(name, `HTTP ${res.status}`);
    } else {
      const body = await res.text().catch(() => '');
      fail(name, `HTTP ${res.status} — ${body.slice(0, 120)}`);
    }
  } catch (err) {
    fail(name, String(err));
  }
}

async function checkSentry() {
  const name = 'Sentry DSN';
  const dsn = env('SENTRY_DSN') || env('NEXT_PUBLIC_SENTRY_DSN');
  if (!dsn) {
    fail(name, 'Missing env var: SENTRY_DSN');
    return;
  }

  // Validate format: https://<key>@<host>.ingest.<tld>/project-id
  const isValid = dsn.startsWith('https://') && dsn.includes('@') && dsn.includes('.ingest.');

  if (isValid) {
    pass(name, 'DSN format valid (no API call needed)');
  } else {
    fail(
      name,
      `DSN format invalid — expected https://<key>@<host>.ingest.<tld>/…, got: ${dsn.slice(0, 60)}`,
    );
  }
}

async function checkApollo() {
  const name = 'Apollo.io';
  const key = requireEnv('APOLLO_API_KEY', name);
  if (!key) return;

  try {
    // Apollo doesn't have a /health endpoint — use a minimal people search
    const res = await fetchWithTimeout('https://api.apollo.io/api/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ per_page: 1, page: 1 }),
    });
    if (res.ok) {
      pass(name, `HTTP ${res.status}`);
    } else if (res.status === 401 || res.status === 403 || res.status === 422) {
      // 401/403 = auth issue but API reachable, 422 = validation error but reachable
      pass(name, `HTTP ${res.status} — API reachable`);
    } else {
      const body = await res.text().catch(() => '');
      fail(name, `HTTP ${res.status} — ${body.slice(0, 120)}`);
    }
  } catch (err) {
    fail(name, String(err));
  }
}

async function checkBraveSearch() {
  const name = 'Brave Search';
  const key = requireEnv('BRAVE_API_KEY', name);
  if (!key) return;

  try {
    const res = await fetchWithTimeout(
      'https://api.search.brave.com/res/v1/web/search?q=test&count=1',
      {
        headers: { 'X-Subscription-Token': key },
      },
    );
    if (res.ok) {
      pass(name, `HTTP ${res.status}`);
    } else {
      const body = await res.text().catch(() => '');
      fail(name, `HTTP ${res.status} — ${body.slice(0, 120)}`);
    }
  } catch (err) {
    fail(name, String(err));
  }
}

async function checkGoogleMaps() {
  const name = 'Google Maps';
  const key = requireEnv('GOOGLE_MAPS_API_KEY', name);
  if (!key) return;

  try {
    const res = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/geocode/json?address=Toronto&key=${key}`,
    );
    if (res.ok) {
      const data = (await res.json()) as { status?: string; error_message?: string };
      if (data.status === 'REQUEST_DENIED') {
        fail(name, `API key denied — ${data.error_message ?? 'no message'}`);
      } else {
        pass(name, `HTTP ${res.status}, status=${data.status}`);
      }
    } else {
      fail(name, `HTTP ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    fail(name, String(err));
  }
}

async function checkTavily() {
  const name = 'Tavily';
  const key = requireEnv('TAVILY_API_KEY', name);
  if (!key) return;

  try {
    const res = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query: 'test', max_results: 1 }),
    });
    if (res.ok) {
      pass(name, `HTTP ${res.status}`);
    } else {
      const body = await res.text().catch(() => '');
      fail(name, `HTTP ${res.status} — ${body.slice(0, 120)}`);
    }
  } catch (err) {
    fail(name, String(err));
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log();
  console.log(
    `${BOLD}KrewPact Service Health Check${RESET}${DEEP ? ` ${YELLOW}(deep mode)${RESET}` : ''}`,
  );
  console.log(`${'─'.repeat(50)}`);
  if (DEEP) {
    console.log(
      `  ${YELLOW}Deep checks enabled — testing data paths, not just connectivity${RESET}`,
    );
  }
  console.log();

  await checkSupabaseRest();
  await checkSupabaseServiceRole();
  await checkClerk();
  await checkUpstashRedis();
  await checkQStash();
  await checkERPNext();
  await checkResend();
  await checkSentry();
  await checkApollo();
  await checkBraveSearch();
  await checkGoogleMaps();
  await checkTavily();

  // ── Summary ──────────────────────────────────────────────────────────────
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log();
  console.log(`${'─'.repeat(50)}`);

  if (failed === 0) {
    console.log(`${GREEN}${BOLD}All ${total}/${total} services connected.${RESET}`);
  } else {
    console.log(
      `${BOLD}Summary: ${GREEN}${passed} passed${RESET} / ${RED}${failed} failed${RESET} (${total} total)`,
    );
    console.log();
    console.log(`${RED}Failed services:${RESET}`);
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  ${CROSS}  ${r.name}${r.note ? ` — ${r.note}` : ''}`);
    }
  }

  console.log();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`${RED}Fatal error:${RESET}`, err);
  process.exit(1);
});
