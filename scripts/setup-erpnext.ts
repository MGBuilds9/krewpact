/**
 * ERPNext company configuration for MDM Group Inc.
 *
 * Idempotent — safe to re-run. Every operation is check-then-create.
 *
 * Usage:
 *   npx tsx scripts/setup-erpnext.ts           # apply changes
 *   npx tsx scripts/setup-erpnext.ts --dry-run  # log what would change
 *
 * Required env vars (in .env.local):
 *   ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET
 *
 * What this configures:
 *   1. 6 Division Cost Centers (contracting, homes, wood, telecom, group-inc, management)
 *   2. Ontario HST 13% tax template (fixes the incorrect 15% default)
 *   3. Role Profiles for OIDC-provisioned users
 *   4. Verifies existing config (company, chart of accounts, fiscal year, currency)
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const BASE_URL = process.env.ERPNEXT_BASE_URL;
const API_KEY = process.env.ERPNEXT_API_KEY;
const API_SECRET = process.env.ERPNEXT_API_SECRET;
const DRY_RUN = process.argv.includes('--dry-run');

if (!BASE_URL || !API_KEY || !API_SECRET) {
  console.error('Missing: ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET');
  process.exit(1);
}

const AUTH = `token ${API_KEY}:${API_SECRET}`;
const COMPANY = 'MDM Group Inc';
const ABBR = 'MDM';

interface ErpResponse {
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
  message?: unknown;
  exc_type?: string;
}

async function erpGet(doctype: string, name?: string): Promise<ErpResponse> {
  const path = name
    ? `/api/resource/${doctype}/${encodeURIComponent(name)}`
    : `/api/resource/${doctype}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: AUTH, Accept: 'application/json' },
  });
  if (res.status === 404) return {};
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed (${res.status}): ${text.substring(0, 200)}`);
  }
  return res.json();
}

async function erpList(
  doctype: string,
  filters?: string,
  limit = 100,
): Promise<Array<Record<string, unknown>>> {
  let path = `/api/resource/${doctype}?limit_page_length=${limit}`;
  if (filters) path += `&filters=${encodeURIComponent(filters)}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: AUTH, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LIST ${doctype} failed (${res.status}): ${text.substring(0, 200)}`);
  }
  const json = (await res.json()) as ErpResponse;
  return (json.data as Array<Record<string, unknown>>) ?? [];
}

async function erpCreate(
  doctype: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create ${doctype}: ${JSON.stringify(data).substring(0, 120)}`);
    return data;
  }
  const res = await fetch(`${BASE_URL}/api/resource/${doctype}`, {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CREATE ${doctype} failed (${res.status}): ${text.substring(0, 300)}`);
  }
  const json = (await res.json()) as ErpResponse;
  return (json.data as Record<string, unknown>) ?? {};
}

async function erpUpdate(
  doctype: string,
  name: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (DRY_RUN) {
    console.log(
      `  [DRY RUN] Would update ${doctype}/${name}: ${JSON.stringify(data).substring(0, 120)}`,
    );
    return;
  }
  const res = await fetch(
    `${BASE_URL}/api/resource/${doctype}/${encodeURIComponent(name)}`,
    {
      method: 'PUT',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UPDATE ${doctype}/${name} failed (${res.status}): ${text.substring(0, 300)}`);
  }
}

// ---------------------------------------------------------------------------
// Step 1: Verify existing config
// ---------------------------------------------------------------------------

async function verifyExisting(): Promise<void> {
  console.log('\n=== Step 1: Verify Existing Config ===\n');

  // Company
  const company = await erpGet('Company', COMPANY);
  if (!company.data) throw new Error(`Company "${COMPANY}" not found — create it manually first`);
  const c = company.data as Record<string, unknown>;
  console.log(`  Company: ${c.company_name} (${c.default_currency}, ${c.country})`);
  if (c.default_currency !== 'CAD') console.warn('  WARNING: Default currency is not CAD');
  if (c.country !== 'Canada') console.warn('  WARNING: Country is not Canada');

  // Chart of accounts
  const accounts = await erpList('Account');
  console.log(`  Accounts: ${accounts.length}`);

  // Fiscal year
  const fy = await erpList('Fiscal Year');
  console.log(`  Fiscal years: ${fy.map((f) => f.name).join(', ')}`);

  // Tax templates
  const taxes = await erpList('Sales Taxes and Charges Template');
  console.log(`  Tax templates: ${taxes.map((t) => t.name).join(', ')}`);

  console.log('  Existing config verified OK');
}

// ---------------------------------------------------------------------------
// Step 2: Create 6 Division Cost Centers
// ---------------------------------------------------------------------------

const DIVISION_COST_CENTERS = [
  { code: 'contracting', name: 'MDM Contracting' },
  { code: 'homes', name: 'MDM Homes' },
  { code: 'wood', name: 'MDM Wood' },
  { code: 'telecom', name: 'MDM Telecom' },
  { code: 'group-inc', name: 'MDM Group Corporate' },
  { code: 'management', name: 'MDM Management' },
];

async function createCostCenters(): Promise<void> {
  console.log('\n=== Step 2: Division Cost Centers ===\n');

  const existing = await erpList('Cost Center');
  const existingNames = new Set(existing.map((cc) => cc.name));

  for (const div of DIVISION_COST_CENTERS) {
    const ccName = `${div.name} - ${ABBR}`;
    if (existingNames.has(ccName)) {
      console.log(`  SKIP: ${ccName} (already exists)`);
      continue;
    }

    console.log(`  CREATE: ${ccName}`);
    await erpCreate('Cost Center', {
      cost_center_name: div.name,
      company: COMPANY,
      parent_cost_center: `${COMPANY} - ${ABBR}`,
      is_group: 0,
    });
    console.log(`    Created ${ccName}`);
  }
}

// ---------------------------------------------------------------------------
// Step 3: Fix Ontario HST (13%, not 15%)
// ---------------------------------------------------------------------------

async function fixOntarioHST(): Promise<void> {
  console.log('\n=== Step 3: Ontario HST 13% ===\n');

  // Check if Ontario HST 13% already exists
  const existing = await erpList('Sales Taxes and Charges Template');
  const names = existing.map((t) => t.name as string);

  if (names.some((n) => n.includes('HST 13%'))) {
    console.log('  SKIP: Ontario HST 13% template already exists');
    return;
  }

  // Check if the 15% one needs correction (HST 15% is for provinces like NL, NS, PE)
  // Ontario is 13%. We create the correct one rather than modifying the existing.
  console.log('  CREATE: Ontario HST 13% template');

  // Find the HST leaf account (not the group "2300 - Duties and Taxes")
  const taxAccounts = await erpList(
    'Account',
    '[["account_type","=","Tax"],["is_group","=",0],["name","like","%HST%"]]',
  );
  let taxAccount: string;

  if (taxAccounts.length > 0) {
    taxAccount = taxAccounts[0].name as string;
    console.log(`  Using existing HST account: ${taxAccount}`);
  } else {
    // Fallback: find any non-group tax account
    const anyTax = await erpList(
      'Account',
      '[["account_type","=","Tax"],["is_group","=",0]]',
    );
    if (anyTax.length === 0) throw new Error('No non-group tax account found');
    taxAccount = anyTax[0].name as string;
    console.log(`  Fallback tax account: ${taxAccount}`);
  }

  await erpCreate('Sales Taxes and Charges Template', {
    title: 'Ontario HST 13%',
    company: COMPANY,
    taxes: [
      {
        charge_type: 'On Net Total',
        account_head: taxAccount,
        description: 'HST @ 13% (Ontario)',
        rate: 13,
      },
    ],
  });
  console.log('  Created Ontario HST 13% template');

  // Also create matching Purchase Taxes template
  console.log('  CREATE: Ontario HST 13% purchase template');
  await erpCreate('Purchase Taxes and Charges Template', {
    title: 'Ontario HST 13%',
    company: COMPANY,
    taxes: [
      {
        charge_type: 'On Net Total',
        account_head: taxAccount,
        description: 'HST @ 13% (Ontario)',
        rate: 13,
        add_deduct_tax: 'Add',
        category: 'Total',
      },
    ],
  });
  console.log('  Created Ontario HST 13% purchase template');
}

// ---------------------------------------------------------------------------
// Step 4: Create Role Profiles for OIDC user provisioning
// ---------------------------------------------------------------------------

const ROLE_PROFILES = [
  {
    name: 'KP - Platform Admin',
    roles: ['System Manager', 'Administrator'],
    kpRole: 'platform_admin',
  },
  {
    name: 'KP - Executive',
    roles: ['Analytics', 'Report Manager'],
    kpRole: 'executive',
  },
  {
    name: 'KP - Project Manager',
    roles: ['Projects User', 'Sales User'],
    kpRole: 'project_manager',
  },
  {
    name: 'KP - Estimator',
    roles: ['Sales User'],
    kpRole: 'estimator',
  },
  {
    name: 'KP - Accounting',
    roles: ['Accounts User', 'Accounts Manager'],
    kpRole: 'accounting',
  },
  {
    name: 'KP - Field Supervisor',
    roles: ['Projects User'],
    kpRole: 'field_supervisor',
  },
  {
    name: 'KP - Operations Manager',
    roles: ['Projects User', 'Sales User', 'Purchase User', 'HR User'],
    kpRole: 'operations_manager',
  },
];

async function createRoleProfiles(): Promise<void> {
  console.log('\n=== Step 4: Role Profiles ===\n');

  const existing = await erpList('Role Profile');
  const existingNames = new Set(existing.map((r) => r.name));

  for (const profile of ROLE_PROFILES) {
    if (existingNames.has(profile.name)) {
      console.log(`  SKIP: ${profile.name} (already exists)`);
      continue;
    }

    console.log(`  CREATE: ${profile.name} → [${profile.roles.join(', ')}]`);
    await erpCreate('Role Profile', {
      role_profile: profile.name,
      roles: profile.roles.map((role) => ({ role })),
    });
    console.log(`    Created ${profile.name}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`ERPNext Setup — ${COMPANY}`);
  console.log(`URL: ${BASE_URL}`);
  if (DRY_RUN) console.log('MODE: DRY RUN (no changes will be made)\n');
  else console.log('MODE: APPLY\n');

  // Test connectivity
  const res = await fetch(`${BASE_URL}/api/method/frappe.auth.get_logged_user`, {
    headers: { Authorization: AUTH },
  });
  if (!res.ok) throw new Error(`Cannot connect to ERPNext: ${res.status}`);
  const user = (await res.json()) as { message: string };
  console.log(`Authenticated as: ${user.message}`);

  await verifyExisting();
  await createCostCenters();
  await fixOntarioHST();
  await createRoleProfiles();

  console.log('\n=== Setup Complete ===');
  console.log('Next steps:');
  console.log('  1. Verify cost centers in ERPNext desk');
  console.log('  2. Set Ontario HST 13% as default tax template for the company');
  console.log('  3. Run user provisioning: npx tsx scripts/seed-test-users.ts');
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
