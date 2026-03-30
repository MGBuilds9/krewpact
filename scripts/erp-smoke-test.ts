import 'dotenv/config';

const BASE_URL = process.env.ERPNEXT_BASE_URL;
const API_KEY = process.env.ERPNEXT_API_KEY;
const API_SECRET = process.env.ERPNEXT_API_SECRET;

if (!BASE_URL || !API_KEY || !API_SECRET) {
  console.error('Missing required env vars: ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET');
  process.exit(1);
}

const authHeader = `token ${API_KEY}:${API_SECRET}`;

interface TestResult {
  name: string;
  passed: boolean;
  count?: number;
  error?: string;
}

async function testAuthCheck(): Promise<TestResult> {
  const name = 'Auth Check (frappe.auth.get_logged_user)';
  try {
    const res = await fetch(`${BASE_URL}/api/method/frappe.auth.get_logged_user`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) {
      return { name, passed: false, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    if (!json.message) {
      return { name, passed: false, error: 'No message field in response' };
    }
    return { name, passed: true };
  } catch (err) {
    return { name, passed: false, error: String(err) };
  }
}

async function testDoctype(doctype: string): Promise<TestResult> {
  const name = doctype;
  const url = `${BASE_URL}/api/resource/${encodeURIComponent(doctype)}?limit_page_length=1`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) {
      return { name, passed: false, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    if (!Array.isArray(json.data)) {
      return { name, passed: false, error: 'Response missing data array' };
    }
    const count = json.data.length;
    if (count > 0 && typeof json.data[0].name !== 'string') {
      return { name, passed: false, error: 'Record missing name field' };
    }
    return { name, passed: true, count };
  } catch (err) {
    return { name, passed: false, error: String(err) };
  }
}

const DOCTYPES = [
  'Customer',
  'Contact',
  'Supplier',
  'Sales Invoice',
  'Purchase Invoice',
  'Project',
  'Purchase Order',
  'Item',
  'Employee',
  'GL Entry',
  'BOM',
];

async function main() {
  console.log(`\nERPNext Smoke Test — ${BASE_URL}\n${'─'.repeat(60)}`);

  const results: TestResult[] = [];

  results.push(await testAuthCheck());
  for (const doctype of DOCTYPES) {
    results.push(await testDoctype(doctype));
  }

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    const detail =
      result.passed
        ? result.count !== undefined
          ? ` (${result.count} record${result.count !== 1 ? 's' : ''} returned)`
          : ''
        : ` — ${result.error}`;
    console.log(`[${status}] ${result.name}${detail}`);
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
