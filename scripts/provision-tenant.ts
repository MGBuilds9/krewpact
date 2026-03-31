/**
 * Provision a new tenant: Supabase org + settings + divisions + admin user + Clerk metadata.
 *
 * Idempotent — upserts on slug/org_id/email. Safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/provision-tenant.ts --file supabase/seed/tenant-template.json
 *   npx tsx scripts/provision-tenant.ts --file config.json --dry-run
 *   npx tsx scripts/provision-tenant.ts --file config.json --skip-clerk
 *
 * Flags:
 *   --file <path>     Required. Path to tenant config JSON.
 *   --dry-run         Validate config and print plan without making changes.
 *   --skip-clerk      Skip Clerk user creation/metadata update (Supabase-only).
 *
 * Required env vars (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CLERK_SECRET_KEY          (unless --skip-clerk)
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// ---------------------------------------------------------------------------
// Config & validation
// ---------------------------------------------------------------------------

interface TenantConfig {
  organization: {
    name: string;
    slug: string;
    subdomain?: string;
    custom_domain?: string;
    timezone?: string;
    locale?: string;
    metadata?: Record<string, unknown>;
  };
  branding?: {
    company_name?: string;
    company_description?: string;
    primary_color?: string;
    accent_color?: string;
    logo_url?: string;
    favicon_url?: string;
    support_email?: string;
    support_url?: string;
    footer_text?: string;
    login_background_url?: string;
    erp_company?: string;
  };
  feature_flags?: Record<string, boolean>;
  divisions?: { code: string; name: string; description?: string }[];
  admin?: {
    email: string;
    first_name: string;
    last_name: string;
    clerk_user_id?: string | null;
  };
}

interface ValidationError {
  field: string;
  message: string;
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIVISION_CODE_PATTERN = /^[a-z0-9-]+$/;
const RESERVED_SLUGS = ['admin', 'api', 'app', 'www', 'mail', 'ftp', 'status', 'help', 'support'];

export function validateTenantConfig(cfg: TenantConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Organization
  if (!cfg.organization?.name?.trim()) {
    errors.push({ field: 'organization.name', message: 'Required' });
  }
  if (!cfg.organization?.slug || !SLUG_PATTERN.test(cfg.organization.slug)) {
    errors.push({
      field: 'organization.slug',
      message: 'Must be 3-50 lowercase alphanumeric chars with hyphens',
    });
  }
  if (RESERVED_SLUGS.includes(cfg.organization?.slug)) {
    errors.push({ field: 'organization.slug', message: `Reserved slug: ${cfg.organization.slug}` });
  }
  if (cfg.organization?.subdomain && !SUBDOMAIN_PATTERN.test(cfg.organization.subdomain)) {
    errors.push({
      field: 'organization.subdomain',
      message: 'Must be 2-32 lowercase alphanumeric chars with hyphens',
    });
  }

  // Branding
  if (cfg.branding?.primary_color && !HEX_COLOR_PATTERN.test(cfg.branding.primary_color)) {
    errors.push({ field: 'branding.primary_color', message: 'Must be hex color (#RRGGBB)' });
  }
  if (cfg.branding?.accent_color && !HEX_COLOR_PATTERN.test(cfg.branding.accent_color)) {
    errors.push({ field: 'branding.accent_color', message: 'Must be hex color (#RRGGBB)' });
  }
  if (cfg.branding?.support_email && !EMAIL_PATTERN.test(cfg.branding.support_email)) {
    errors.push({ field: 'branding.support_email', message: 'Invalid email' });
  }

  // Divisions
  if (cfg.divisions) {
    if (!Array.isArray(cfg.divisions) || cfg.divisions.length === 0) {
      errors.push({ field: 'divisions', message: 'Must be a non-empty array' });
    }
    const codes = new Set<string>();
    for (const div of cfg.divisions ?? []) {
      if (!div.code || !DIVISION_CODE_PATTERN.test(div.code)) {
        errors.push({
          field: `divisions[${div.code}].code`,
          message: 'Must be lowercase alphanumeric with hyphens',
        });
      }
      if (!div.name?.trim()) {
        errors.push({ field: `divisions[${div.code}].name`, message: 'Required' });
      }
      if (codes.has(div.code)) {
        errors.push({ field: `divisions[${div.code}].code`, message: 'Duplicate division code' });
      }
      codes.add(div.code);
    }
  }

  // Admin
  if (cfg.admin) {
    if (!cfg.admin.email || !EMAIL_PATTERN.test(cfg.admin.email)) {
      errors.push({ field: 'admin.email', message: 'Valid email required' });
    }
    if (!cfg.admin.first_name?.trim()) {
      errors.push({ field: 'admin.first_name', message: 'Required' });
    }
    if (!cfg.admin.last_name?.trim()) {
      errors.push({ field: 'admin.last_name', message: 'Required' });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Clerk API helper
// ---------------------------------------------------------------------------

function getClerkSecretKey(): string | undefined {
  return process.env.CLERK_SECRET_KEY;
}

async function clerkApi(path: string, method: string, body?: unknown): Promise<unknown> {
  const clerkKey = getClerkSecretKey();
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${clerkKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clerk ${method} ${path} (${res.status}): ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Provisioning steps
// ---------------------------------------------------------------------------

interface ProvisionResult {
  orgId: string;
  orgSlug: string;
  adminUserId?: string;
  adminClerkId?: string;
  divisionCount: number;
  warnings: string[];
}

async function checkSlugAvailability(
  supabase: SupabaseClient,
  slug: string,
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single();
  return data as { id: string } | null;
}

async function provisionOrg(
  supabase: SupabaseClient,
  cfg: TenantConfig,
): Promise<string> {
  const { data, error } = await supabase
    .from('organizations')
    .upsert(
      {
        name: cfg.organization.name,
        slug: cfg.organization.slug,
        subdomain: cfg.organization.subdomain ?? cfg.organization.slug,
        custom_domain: cfg.organization.custom_domain ?? null,
        timezone: cfg.organization.timezone ?? 'America/Toronto',
        locale: cfg.organization.locale ?? 'en-CA',
        metadata: cfg.organization.metadata ?? {},
        status: 'active',
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();

  if (error || !data) throw new Error(`Failed to upsert organization: ${error?.message}`);
  return data.id as string;
}

async function provisionOrgSettings(
  supabase: SupabaseClient,
  orgId: string,
  cfg: TenantConfig,
): Promise<void> {
  const branding = {
    company_name: cfg.branding?.company_name ?? cfg.organization.name,
    company_description: cfg.branding?.company_description ?? '',
    primary_color: cfg.branding?.primary_color ?? '#2563eb',
    accent_color: cfg.branding?.accent_color ?? '#f59e0b',
    logo_url: cfg.branding?.logo_url ?? '',
    favicon_url: cfg.branding?.favicon_url ?? '',
    support_email: cfg.branding?.support_email ?? '',
    support_url: cfg.branding?.support_url ?? '',
    footer_text: cfg.branding?.footer_text ?? '',
    login_background_url: cfg.branding?.login_background_url ?? '',
    erp_company: cfg.branding?.erp_company ?? '',
  };

  const { error } = await supabase.from('org_settings').upsert(
    {
      org_id: orgId,
      branding,
      workflow: {},
      feature_flags: cfg.feature_flags ?? {},
    },
    { onConflict: 'org_id' },
  );

  if (error) throw new Error(`Failed to upsert org_settings: ${error.message}`);
}

async function provisionDivisions(
  supabase: SupabaseClient,
  orgId: string,
  divisions: TenantConfig['divisions'],
): Promise<number> {
  if (!divisions?.length) return 0;

  const rows = divisions.map((d) => ({ ...d, org_id: orgId }));
  const { error } = await supabase.from('divisions').upsert(rows, { onConflict: 'org_id,code' });
  if (error) throw new Error(`Failed to upsert divisions: ${error.message}`);
  return rows.length;
}

async function ensureRolesExist(supabase: SupabaseClient): Promise<void> {
  const roles = [
    { role_key: 'platform_admin', role_name: 'Platform Admin', scope: 'company' },
    { role_key: 'executive', role_name: 'Executive', scope: 'company' },
    { role_key: 'operations_manager', role_name: 'Operations Manager', scope: 'division' },
    { role_key: 'project_manager', role_name: 'Project Manager', scope: 'project' },
    { role_key: 'project_coordinator', role_name: 'Project Coordinator', scope: 'project' },
    { role_key: 'estimator', role_name: 'Estimator', scope: 'division' },
    { role_key: 'field_supervisor', role_name: 'Field Supervisor', scope: 'project' },
    { role_key: 'accounting', role_name: 'Accounting', scope: 'company' },
    { role_key: 'payroll_admin', role_name: 'Payroll Admin', scope: 'company' },
    { role_key: 'client_owner', role_name: 'Client Owner', scope: 'project' },
    { role_key: 'client_delegate', role_name: 'Client Delegate', scope: 'project' },
    { role_key: 'trade_partner_admin', role_name: 'Trade Partner Admin', scope: 'project' },
    { role_key: 'trade_partner_user', role_name: 'Trade Partner User', scope: 'project' },
  ];

  const { error } = await supabase.from('roles').upsert(roles, { onConflict: 'role_key' });
  if (error) throw new Error(`Failed to ensure roles: ${error.message}`);
}

async function provisionAdmin(
  supabase: SupabaseClient,
  orgId: string,
  orgSlug: string,
  admin: NonNullable<TenantConfig['admin']>,
  divisionCodes: string[],
  skipClerk: boolean,
): Promise<{ dbUserId: string; clerkId: string | null; warnings: string[] }> {
  const warnings: string[] = [];

  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id, clerk_id')
    .eq('email', admin.email)
    .limit(1);

  let dbUserId: string;
  let clerkId: string | null = admin.clerk_user_id ?? null;

  if (existing && existing.length > 0) {
    dbUserId = existing[0].id as string;
    clerkId = (existing[0].clerk_id as string) ?? clerkId;
    console.log(`  Admin user exists (db: ${dbUserId})`);

    // Ensure org_id is set
    await supabase.from('users').update({ org_id: orgId }).eq('id', dbUserId);
  } else {
    // Create Clerk user if needed
    if (!clerkId && !skipClerk) {
      if (!getClerkSecretKey()) {
        throw new Error('CLERK_SECRET_KEY required to create admin user. Use --skip-clerk to skip.');
      }

      // Check if Clerk user already exists by email
      const searchResult = (await clerkApi(
        `/users?email_address=${encodeURIComponent(admin.email)}`,
        'GET',
      )) as { id: string }[];

      if (searchResult.length > 0) {
        clerkId = searchResult[0].id;
        console.log(`  Found existing Clerk user: ${clerkId}`);
      } else {
        const password = process.env.TENANT_ADMIN_PASSWORD;
        if (!password) {
          throw new Error(
            'Set TENANT_ADMIN_PASSWORD env var for new Clerk user, or pre-create the user and provide clerk_user_id in config.',
          );
        }

        const clerkUser = (await clerkApi('/users', 'POST', {
          email_address: [admin.email],
          password,
          first_name: admin.first_name,
          last_name: admin.last_name,
          skip_password_checks: true,
        })) as { id: string };
        clerkId = clerkUser.id;
        console.log(`  Created Clerk user: ${clerkId}`);
      }
    }

    if (!clerkId) {
      warnings.push('No Clerk user ID — admin record created without Clerk link. Set clerk_id manually.');
    }

    // Insert Supabase user
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .insert({
        ...(clerkId ? { clerk_id: clerkId } : {}),
        email: admin.email,
        full_name: `${admin.first_name} ${admin.last_name}`,
        org_id: orgId,
        is_active: true,
      })
      .select('id')
      .single();

    if (userError || !dbUser) throw new Error(`Failed to create admin user: ${userError?.message}`);
    dbUserId = dbUser.id as string;
    console.log(`  Created Supabase user: ${dbUserId}`);
  }

  // Assign platform_admin role
  const { data: roleData } = await supabase
    .from('roles')
    .select('id')
    .eq('role_key', 'platform_admin')
    .single();
  if (!roleData) throw new Error('platform_admin role not found — run roles upsert first');

  await supabase
    .from('user_roles')
    .upsert({ user_id: dbUserId, role_id: roleData.id }, { onConflict: 'user_id,role_id' });

  // Assign all divisions
  const { data: divs } = await supabase
    .from('divisions')
    .select('id')
    .eq('org_id', orgId)
    .in('code', divisionCodes);
  const divisionIds = (divs ?? []).map((d) => d.id as string);

  if (divisionIds.length > 0) {
    const rows = divisionIds.map((divId) => ({ user_id: dbUserId, division_id: divId }));
    await supabase.from('user_divisions').upsert(rows, { onConflict: 'user_id,division_id' });
  }

  // Update Clerk metadata
  if (clerkId && !skipClerk && getClerkSecretKey()) {
    await clerkApi(`/users/${clerkId}/metadata`, 'PATCH', {
      public_metadata: {
        krewpact_user_id: dbUserId,
        krewpact_org_id: orgId,
        krewpact_org_slug: orgSlug,
        division_ids: divisionIds,
        role_keys: ['platform_admin'],
      },
    });
    console.log(`  Updated Clerk metadata`);
  } else if (clerkId) {
    warnings.push(
      `Clerk metadata not updated. Manually set publicMetadata on ${clerkId}: ` +
        `krewpact_user_id=${dbUserId}, krewpact_org_id=${orgId}, krewpact_org_slug=${orgSlug}`,
    );
  }

  return { dbUserId, clerkId, warnings };
}

// ---------------------------------------------------------------------------
// Validation step (post-provision)
// ---------------------------------------------------------------------------

async function validateTenant(
  supabase: SupabaseClient,
  orgId: string,
  slug: string,
): Promise<string[]> {
  const issues: string[] = [];

  // Verify org exists
  const { data: org } = await supabase
    .from('organizations')
    .select('id, slug, status, subdomain')
    .eq('id', orgId)
    .single();
  if (!org) {
    issues.push('CRITICAL: Organization not found in DB');
    return issues;
  }
  if (org.status !== 'active') issues.push(`Organization status is '${org.status}', not 'active'`);
  if (!org.subdomain) issues.push('No subdomain configured — tenant resolution will fail');

  // Verify settings
  const { data: settings } = await supabase
    .from('org_settings')
    .select('branding, feature_flags')
    .eq('org_id', orgId)
    .single();
  if (!settings) {
    issues.push('CRITICAL: org_settings not found');
  } else {
    const branding = settings.branding as Record<string, unknown> | null;
    if (!branding?.company_name) issues.push('Branding missing company_name');
  }

  // Verify divisions
  const { count: divCount } = await supabase
    .from('divisions')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  if (!divCount || divCount === 0) issues.push('No divisions created');

  // Verify admin user
  const { data: admins } = await supabase
    .from('users')
    .select('id, clerk_id, email')
    .eq('org_id', orgId)
    .limit(1);
  if (!admins?.length) {
    issues.push('No users assigned to this organization');
  } else {
    const admin = admins[0];
    if (!admin.clerk_id) issues.push(`Admin user (${admin.email}) has no clerk_id — login will fail`);

    // Check admin has platform_admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role_id, roles!inner(role_key)')
      .eq('user_id', admin.id);
    const roleKeys = (roles ?? []).map(
      (r) => (r.roles as unknown as { role_key: string }).role_key,
    );
    if (!roleKeys.includes('platform_admin')) {
      issues.push(`Admin user lacks platform_admin role (has: ${roleKeys.join(', ') || 'none'})`);
    }
  }

  // Verify slug uniqueness (shouldn't fail if upsert worked, but paranoia)
  const { count: slugCount } = await supabase
    .from('organizations')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug);
  if (slugCount && slugCount > 1) issues.push(`CRITICAL: Duplicate slug '${slug}' in organizations`);

  return issues;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run');
  const SKIP_CLERK = process.argv.includes('--skip-clerk');
  const fileIdx = process.argv.findIndex((a) => a === '--file');

  if (fileIdx < 0 || !process.argv[fileIdx + 1]) {
    console.error('Usage: npx tsx scripts/provision-tenant.ts --file <config.json> [--dry-run] [--skip-clerk]');
    process.exit(1);
  }

  const configPath = process.argv[fileIdx + 1];
  let tenantConfig: TenantConfig;
  try {
    tenantConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as TenantConfig;
  } catch (err) {
    console.error(`Failed to read config: ${err}`);
    process.exit(1);
  }

  // Validate
  console.log('Validating config...');
  const validationErrors = validateTenantConfig(tenantConfig);
  if (validationErrors.length > 0) {
    console.error('Validation failed:');
    for (const e of validationErrors) {
      console.error(`  ${e.field}: ${e.message}`);
    }
    process.exit(1);
  }
  console.log('  Config valid');

  // Check env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  if (!SKIP_CLERK && !getClerkSecretKey() && tenantConfig.admin) {
    console.error('Missing CLERK_SECRET_KEY. Use --skip-clerk to skip Clerk operations.');
    process.exit(1);
  }

  // Print plan
  const org = tenantConfig.organization;
  const divCodes = (tenantConfig.divisions ?? []).map((d) => d.code);
  const flagCount = Object.keys(tenantConfig.feature_flags ?? {}).length;
  const enabledFlags = Object.entries(tenantConfig.feature_flags ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  console.log('\nProvisioning plan:');
  console.log(`  Organization: ${org.name} (slug: ${org.slug})`);
  console.log(`  Subdomain:    ${org.subdomain ?? org.slug}.krewpact.com`);
  if (org.custom_domain) console.log(`  Custom domain: ${org.custom_domain}`);
  console.log(`  Divisions:    ${divCodes.join(', ') || '(none)'}`);
  console.log(`  Feature flags: ${flagCount} total, ${enabledFlags.length} enabled (${enabledFlags.join(', ') || 'none'})`);
  if (tenantConfig.admin) {
    console.log(`  Admin:        ${tenantConfig.admin.email} (${tenantConfig.admin.first_name} ${tenantConfig.admin.last_name})`);
    if (tenantConfig.admin.clerk_user_id) {
      console.log(`  Clerk user:   ${tenantConfig.admin.clerk_user_id} (pre-existing)`);
    }
  }
  if (SKIP_CLERK) console.log('  [--skip-clerk] Clerk operations will be skipped');

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes made.');
    process.exit(0);
  }

  // Execute
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('\nProvisioning...');

  // Check if org already exists
  const existingOrg = await checkSlugAvailability(supabase, org.slug);
  if (existingOrg) {
    console.log(`  Organization already exists (id: ${existingOrg.id}) — will update`);
  }

  // Step 1: Organization
  console.log('  [1/5] Organization...');
  const orgId = await provisionOrg(supabase, tenantConfig);
  console.log(`         id: ${orgId}`);

  // Step 2: Org settings (branding + feature flags)
  console.log('  [2/5] Settings (branding + feature flags)...');
  await provisionOrgSettings(supabase, orgId, tenantConfig);
  console.log('         done');

  // Step 3: Divisions
  console.log('  [3/5] Divisions...');
  const divCount = await provisionDivisions(supabase, orgId, tenantConfig.divisions);
  console.log(`         ${divCount} divisions`);

  // Step 4: Roles (global, idempotent)
  console.log('  [4/5] Roles (global)...');
  await ensureRolesExist(supabase);
  console.log('         13 roles ensured');

  // Step 5: Admin user
  const result: ProvisionResult = {
    orgId,
    orgSlug: org.slug,
    divisionCount: divCount,
    warnings: [],
  };

  if (tenantConfig.admin) {
    console.log('  [5/5] Admin user...');
    const adminResult = await provisionAdmin(
      supabase,
      orgId,
      org.slug,
      tenantConfig.admin,
      divCodes,
      SKIP_CLERK,
    );
    result.adminUserId = adminResult.dbUserId;
    result.adminClerkId = adminResult.clerkId ?? undefined;
    result.warnings = adminResult.warnings;
  } else {
    console.log('  [5/5] Admin user... skipped (not in config)');
  }

  // Validate
  console.log('\nValidating...');
  const issues = await validateTenant(supabase, orgId, org.slug);

  if (issues.length > 0) {
    console.warn('\nValidation issues:');
    for (const issue of issues) {
      console.warn(`  ⚠ ${issue}`);
    }
  } else {
    console.log('  All checks passed');
  }

  if (result.warnings.length > 0) {
    console.warn('\nWarnings:');
    for (const w of result.warnings) {
      console.warn(`  ⚠ ${w}`);
    }
  }

  // Summary
  console.log('\n=== Tenant Provisioned ===');
  console.log(`  Org:       ${org.name}`);
  console.log(`  Org ID:    ${result.orgId}`);
  console.log(`  Slug:      ${result.orgSlug}`);
  console.log(`  URL:       https://${org.subdomain ?? org.slug}.krewpact.com`);
  if (result.adminUserId) {
    console.log(`  Admin DB:  ${result.adminUserId}`);
  }
  if (result.adminClerkId) {
    console.log(`  Admin Clerk: ${result.adminClerkId}`);
  }
  console.log(`  Divisions: ${result.divisionCount}`);
  console.log(`  Flags:     ${enabledFlags.length} enabled`);

  if (issues.some((i) => i.startsWith('CRITICAL'))) {
    console.error('\nCRITICAL issues found — tenant may not be functional.');
    process.exit(1);
  }
}

// Only run when executed directly (not imported for testing)
const isDirectExecution =
  process.argv[1]?.endsWith('provision-tenant.ts') ||
  process.argv[1]?.endsWith('provision-tenant');

if (isDirectExecution) {
  config({ path: '.env.local' });
  main().catch((err) => {
    console.error('\nProvisioning failed:', err);
    process.exit(1);
  });
}
