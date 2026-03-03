/**
 * KrewPact Real Data Seed Script
 *
 * Imports actual MDM customer and lead data from Excel files into Supabase CRM tables.
 * Sources:
 *   - data/Customer List.xlsx → accounts + leads + contacts (14 pharmacy clients)
 *   - data/Leads for contracting.xlsx → leads + contacts (~370 leads across 5 sheets)
 *
 * DB schema notes:
 *   - leads: NO email/phone/metadata columns. Contact info goes in contacts table.
 *     Extra data goes in enrichment_data (JSONB).
 *   - contacts: linked via lead_id (no account_id column).
 *
 * Usage:
 *   npx tsx scripts/seed-real-data.ts          # seed all data
 *   npx tsx scripts/seed-real-data.ts --clean  # wipe real-data tagged records first
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = serviceRoleKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and auth key in .env.local');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.warn('⚠️  No SUPABASE_SERVICE_ROLE_KEY — using anon key (requires demo RLS policies)\n');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CLEAN = process.argv.includes('--clean');
const DATA_DIR = path.join(process.cwd(), 'data');

// ── Helpers ──────────────────────────────────────────────────────

function trim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function cleanPhone(v: unknown): string | null {
  if (!v) return null;
  return String(v).replace(/^'+/, '').trim() || null;
}

function parseName(fullName: string): { first_name: string; last_name: string } {
  const cleaned = fullName
    .replace(/\(.*?\)/g, '')
    .replace(/^Dr\.\s*/i, '')
    .trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

function isEmptyRow(row: unknown[]): boolean {
  return !row || row.every((v) => v == null || String(v).trim() === '');
}

function isDecisionMaker(seniority: string): boolean {
  const dm = ['owner', 'director', 'c-suite', 'head', 'partner', 'founder', 'president', 'vp'];
  const lower = (seniority || '').toLowerCase();
  return dm.some((s) => lower.includes(s));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function softInsert(table: string, rows: any[], selectCols = '*'): Promise<any[]> {
  if (!rows.length) return [];
  const results = [];
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { data, error } = await supabase.from(table).insert(batch).select(selectCols);
    if (error) {
      console.warn(
        `   ⚠️  ${table} insert warning (batch ${Math.floor(i / 50) + 1}): ${error.message}`,
      );
    } else if (data) {
      results.push(...data);
    }
  }
  return results;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readSheet(wb: XLSX.WorkBook, name: string): any[][] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
}

// ── Main ─────────────────────────────────────────────────────────

async function seed() {
  console.log('📦 KrewPact Real Data Seed — starting...\n');

  // ── 1. Fetch divisions ─────────────────────────────────────
  console.log('1/6  Fetching divisions...');
  const { data: divisions, error: divErr } = await supabase.from('divisions').select('*');
  if (divErr || !divisions?.length) {
    console.error('Cannot fetch divisions:', divErr);
    process.exit(1);
  }

  const divMap: Record<string, string> = {};
  for (const d of divisions) {
    const rec = d as Record<string, unknown>;
    const nameKey = String(rec.code ?? rec.name ?? '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const canonical: Record<string, string> = {
      'mdm-contracting': 'contracting',
      'mdm-homes': 'homes',
      'mdm-wood': 'wood',
      'mdm-telecom': 'telecom',
      'mdm-group-inc': 'group-inc',
      'mdm-management': 'management',
    };
    divMap[canonical[nameKey] ?? nameKey] = rec.id as string;
  }
  console.log(`   Found ${divisions.length} divisions: ${Object.keys(divMap).join(', ')}`);

  // ── Clean if requested ─────────────────────────────────────
  if (CLEAN) {
    console.log('\n   🧹 Cleaning existing real data (tagged records)...');
    const sources = ['apollo', 'networking', 'outreach', 'door_knocking', 'existing_client'];
    // Get lead IDs for these sources
    const { data: taggedLeads } = await supabase
      .from('leads')
      .select('id')
      .in('source_channel', sources);
    const leadIds = (taggedLeads ?? []).map((l) => l.id);
    if (leadIds.length) {
      // Delete contacts linked to those leads (batch to avoid URL length limits)
      for (let i = 0; i < leadIds.length; i += 100) {
        await supabase
          .from('contacts')
          .delete()
          .in('lead_id', leadIds.slice(i, i + 100));
      }
      // Delete the leads themselves
      for (let i = 0; i < leadIds.length; i += 100) {
        await supabase
          .from('leads')
          .delete()
          .in('id', leadIds.slice(i, i + 100));
      }
    }
    // Delete accounts tagged as real data
    await supabase.from('accounts').delete().like('notes', '%[real-data]%');
    console.log('   Done cleaning.\n');
  }

  // ── 2. Customer List → accounts + leads + contacts ──────────
  console.log('2/6  Importing Customer List (pharmacies)...');
  const custWb = XLSX.readFile(path.join(DATA_DIR, 'Customer List.xlsx'));
  const custRows = readSheet(custWb, custWb.SheetNames[0]);

  const accountRows = [];
  const customerLeadRows = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerContactData: { pharmacy: string; contact: any }[] = [];

  for (let i = 1; i < custRows.length; i++) {
    const row = custRows[i];
    if (isEmptyRow(row)) continue;

    const customerName = trim(row[0]);
    const pharmacy = trim(row[1]);
    const address = trim(row[2]);
    const phone = cleanPhone(row[3]);
    const email = trim(row[4]) || null;

    if (!pharmacy) continue;

    accountRows.push({
      account_name: pharmacy,
      account_type: 'client',
      billing_address: { street: address },
      division_id: divMap['contracting'],
      notes: `[real-data] Existing pharmacy client. Contact: ${customerName}`,
    });

    // Create a lead for each customer so contacts can link via lead_id
    customerLeadRows.push({
      company_name: pharmacy,
      source_channel: 'existing_client',
      status: 'won' as const,
      division_id: divMap['contracting'],
      industry: 'healthcare',
      address,
      is_qualified: true,
      enrichment_data: {
        import_source: 'real-data',
        contact_name: customerName,
        contact_email: email,
        contact_phone: phone,
      },
    });

    const { first_name, last_name } = parseName(customerName);
    customerContactData.push({
      pharmacy,
      contact: {
        first_name,
        last_name,
        full_name: customerName,
        email,
        phone,
        is_primary: true,
        title: 'Owner',
      },
    });
  }

  // Dedup accounts by name
  const { data: existingAccounts } = await supabase.from('accounts').select('account_name');
  const existingNames = new Set((existingAccounts ?? []).map((a) => a.account_name));
  const newAccounts = accountRows.filter((a) => !existingNames.has(a.account_name));

  const insertedAccounts = await softInsert('accounts', newAccounts, 'id, account_name');
  console.log(
    `   Inserted ${insertedAccounts.length} accounts (${accountRows.length - newAccounts.length} skipped as duplicates).`,
  );

  // Insert customer leads
  const insertedCustLeads = await softInsert('leads', customerLeadRows, 'id, company_name');
  console.log(`   Inserted ${insertedCustLeads.length} customer leads.`);
  const custLeadMap = Object.fromEntries(insertedCustLeads.map((l) => [l.company_name, l.id]));

  // Link contacts to leads
  const linkedContacts = customerContactData
    .filter((c) => custLeadMap[c.pharmacy])
    .map((c) => ({
      ...c.contact,
      lead_id: custLeadMap[c.pharmacy],
    }));

  const insertedCustContacts = await softInsert('contacts', linkedContacts, 'id, full_name');
  console.log(`   Inserted ${insertedCustContacts.length} customer contacts.`);

  // ── 3. Apollo Clinics → leads + contacts ────────────────────
  console.log('3/6  Importing Apollo Clinics (225 leads)...');
  const leadsWb = XLSX.readFile(path.join(DATA_DIR, 'Leads for contracting.xlsx'));
  const clinicRows = readSheet(leadsWb, 'Clinics and medical centre owne');

  const apolloLeads = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apolloContactData: { companyName: string; email: string; contact: any }[] = [];
  const seenEmails = new Set<string>();

  for (let i = 1; i < clinicRows.length; i++) {
    const r = clinicRows[i];
    if (isEmptyRow(r)) continue;

    const firstName = trim(r[0]);
    const lastName = trim(r[1]);
    const email = trim(r[5]);
    if (!firstName || !email) continue;
    if (seenEmails.has(email.toLowerCase())) continue;
    seenEmails.add(email.toLowerCase());

    const companyName = trim(r[3]) || trim(r[4]) || `${firstName} ${lastName}`;
    const fullName = `${firstName} ${lastName}`.trim();

    apolloLeads.push({
      company_name: companyName,
      source_channel: 'apollo',
      status: 'new',
      division_id: divMap['contracting'],
      industry: 'healthcare',
      city: trim(r[16]) || null,
      province: trim(r[17]) || null,
      enrichment_status: 'complete',
      enrichment_data: {
        source: 'apollo',
        contact_name: fullName,
        contact_email: email,
        contact_phone: cleanPhone(r[9]),
        title: trim(r[2]),
        seniority: trim(r[7]),
        departments: trim(r[8]),
        employees: r[10] || null,
        website: trim(r[12]) || null,
        annual_revenue: r[25] || null,
        linkedin_url: trim(r[11]) || null,
        company_linkedin_url: trim(r[13]) || null,
        facebook_url: trim(r[14]) || null,
        twitter_url: trim(r[15]) || null,
        company_address: trim(r[19]) || null,
        company_city: trim(r[20]) || null,
        company_state: trim(r[21]) || null,
        company_country: trim(r[22]) || null,
        company_phone: cleanPhone(r[23]),
        technologies: trim(r[24]) || null,
        email_status: trim(r[6]) || null,
        subsidiary_of: trim(r[26]) || null,
        retail_locations: r[27] || null,
      },
    });

    apolloContactData.push({
      companyName,
      email: email.toLowerCase(),
      contact: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email,
        phone: cleanPhone(r[9]),
        title: trim(r[2]) || null,
        linkedin_url: trim(r[11]) || null,
        is_primary: true,
        is_decision_maker: isDecisionMaker(trim(r[7])),
      },
    });
  }

  const insertedApolloLeads = await softInsert('leads', apolloLeads, 'id, company_name');
  console.log(`   Inserted ${insertedApolloLeads.length} Apollo leads.`);

  // Map company_name → lead_id for contact linking
  const apolloLeadMap = Object.fromEntries(insertedApolloLeads.map((l) => [l.company_name, l.id]));

  const linkedApolloContacts = apolloContactData
    .filter((c) => apolloLeadMap[c.companyName])
    .map((c) => ({
      ...c.contact,
      lead_id: apolloLeadMap[c.companyName],
    }));

  const insertedApolloContacts = await softInsert(
    'contacts',
    linkedApolloContacts,
    'id, full_name',
  );
  console.log(`   Inserted ${insertedApolloContacts.length} Apollo contacts.`);

  // ── 4. Curated MDM Meet → leads ─────────────────────────────
  console.log('4/6  Importing Curated MDM Meet (116 leads)...');
  const meetRows = readSheet(leadsWb, 'Curated MDM Meet');

  const meetLeads = [];
  for (let i = 1; i < meetRows.length; i++) {
    const r = meetRows[i];
    if (isEmptyRow(r)) continue;

    const name = trim(r[0]);
    if (!name) continue;

    const email = trim(r[5]) || null;
    const primaryEmail = email?.split(/[\r\n]+/)[0]?.trim() || null;
    const phone = cleanPhone(trim(r[4])?.split(/[\r\n]+/)[0]);

    meetLeads.push({
      company_name: trim(r[2]) || name,
      source_channel: 'networking',
      status: 'new',
      division_id: divMap['contracting'],
      enrichment_data: {
        import_source: 'real-data',
        contact_name: name,
        contact_email: primaryEmail,
        contact_phone: phone,
        title: trim(r[1]) || null,
        linkedin_url: trim(r[3]) || null,
        region: trim(r[6]) || null,
        notes: trim(r[7]) || null,
      },
    });
  }

  const insertedMeetLeads = await softInsert('leads', meetLeads, 'id, company_name');
  console.log(`   Inserted ${insertedMeetLeads.length} networking leads.`);

  // ── 5. Groups & Associations → leads ────────────────────────
  console.log('5/6  Importing Groups & Associations...');
  const groupRows = readSheet(leadsWb, 'Groups and Associations');

  const groupLeads = [];
  let currentGroup = '';

  for (let i = 2; i < groupRows.length; i++) {
    const r = groupRows[i];
    if (isEmptyRow(r)) continue;

    if (trim(r[0])) {
      currentGroup = trim(r[0]);
    }

    const contactStr = trim(r[1]);
    if (!contactStr || contactStr === '—') continue;

    const email = trim(r[4]);
    if (!email || email === 'Unavailable' || email === 'Not publicly displayed') continue;

    const nameMatch = contactStr.match(/^([^(]+?)(?:\s*\(([^)]+)\))?$/);
    const contactName = nameMatch ? nameMatch[1].trim() : contactStr;
    const contactTitle = nameMatch?.[2] || null;

    const primaryEmail = email.split(/[\r\n]+/)[0]?.trim() || null;
    if (!primaryEmail) continue;

    const phone = cleanPhone(r[3]);
    let followUpDate: string | null = null;
    if (r[6] && typeof r[6] === 'number') {
      const d = XLSX.SSF.parse_date_code(r[6]);
      followUpDate = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }

    groupLeads.push({
      company_name: currentGroup || contactName,
      source_channel: 'outreach',
      status: 'new',
      division_id: divMap['contracting'],
      enrichment_data: {
        import_source: 'real-data',
        contact_name: contactName,
        contact_email: primaryEmail,
        contact_phone: phone,
        title: contactTitle,
        office: trim(r[2]) || null,
        notes: trim(r[5]) || null,
        follow_up_date: followUpDate,
        what_happened: trim(r[8]) || null,
      },
    });
  }

  const insertedGroupLeads = await softInsert('leads', groupLeads, 'id, company_name');
  console.log(`   Inserted ${insertedGroupLeads.length} group/association leads.`);

  // ── 6. Plaza Targeting + City Contacts → leads ──────────────
  console.log('6/6  Importing Plaza Targeting + City Contacts...');
  const plazaRows = readSheet(leadsWb, 'Plaza targeting Strat.');

  const plazaLeads = [];
  for (let i = 2; i < plazaRows.length; i++) {
    const r = plazaRows[i];
    if (isEmptyRow(r)) continue;

    const siteName = trim(r[1]);
    if (!siteName) continue;

    plazaLeads.push({
      company_name: siteName,
      source_channel: 'door_knocking',
      status: 'new',
      division_id: divMap['contracting'],
      city: trim(r[0]) || null,
      province: 'Ontario',
      enrichment_data: {
        import_source: 'real-data',
        phase: trim(r[2]) || null,
        details: trim(r[3]) || null,
        developer_owner: trim(r[4]) || null,
        on_site_contact: trim(r[5]) || null,
        strategy: trim(r[6]) || null,
        notes: trim(r[7]) || null,
      },
    });
  }

  const insertedPlazaLeads = await softInsert('leads', plazaLeads, 'id, company_name');
  console.log(`   Inserted ${insertedPlazaLeads.length} plaza targeting leads.`);

  // City and Plaza contacts
  const cityRows = readSheet(leadsWb, 'City and Plaza contacts');
  const cityLeads = [];
  let currentSite = '';

  for (let i = 1; i < cityRows.length; i++) {
    const r = cityRows[i];
    if (isEmptyRow(r)) continue;

    const col0 = trim(r[0]);
    const col1 = trim(r[1]);
    const col2 = trim(r[2]);

    if (col0 && !col1 && !col2) {
      currentSite = col0;
      continue;
    }
    if (col0 === 'Organization' || col0 === 'Door Knocking Plan') continue;

    const org = col0;
    const contact = col1;
    const role = col2;
    const info = trim(r[3]);
    const notes = trim(r[4]);

    if (!org && !contact) continue;
    if (contact === 'n/a' || contact === '—') continue;

    const emailMatch = info?.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch?.[0] || null;
    const phoneMatch = info?.match(/[\d\-()+ ext.]+\d{4}/);
    const phone = phoneMatch ? cleanPhone(phoneMatch[0]) : null;

    cityLeads.push({
      company_name: org || currentSite,
      source_channel: 'door_knocking',
      status: 'new',
      division_id: divMap['contracting'],
      enrichment_data: {
        import_source: 'real-data',
        contact_name: contact || null,
        contact_email: email,
        contact_phone: phone,
        role: role || null,
        info: info || null,
        site_reference: currentSite || null,
        notes: notes || null,
      },
    });
  }

  const insertedCityLeads = await softInsert('leads', cityLeads, 'id, company_name');
  console.log(`   Inserted ${insertedCityLeads.length} city/plaza contact leads.`);

  // ── Summary ────────────────────────────────────────────────
  const totalAccounts = insertedAccounts.length;
  const totalContacts = insertedCustContacts.length + insertedApolloContacts.length;
  const totalLeads =
    insertedCustLeads.length +
    insertedApolloLeads.length +
    insertedMeetLeads.length +
    insertedGroupLeads.length +
    insertedPlazaLeads.length +
    insertedCityLeads.length;

  console.log('\n✅ Real data seed complete!');
  console.log(`   - ${totalAccounts} accounts (pharmacy clients)`);
  console.log(
    `   - ${totalContacts} contacts (${insertedCustContacts.length} customer + ${insertedApolloContacts.length} Apollo)`,
  );
  console.log(`   - ${totalLeads} leads:`);
  console.log(`     · ${insertedCustLeads.length} existing clients (pharmacies)`);
  console.log(`     · ${insertedApolloLeads.length} Apollo (clinics/healthcare)`);
  console.log(`     · ${insertedMeetLeads.length} networking (MDM Meet)`);
  console.log(`     · ${insertedGroupLeads.length} outreach (groups & associations)`);
  console.log(`     · ${insertedPlazaLeads.length} door knocking (plaza targeting)`);
  console.log(`     · ${insertedCityLeads.length} door knocking (city contacts)`);
  console.log('\nRun `npm run dev` and navigate to /crm/leads to see the data.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
