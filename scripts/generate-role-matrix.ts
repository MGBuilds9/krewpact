/**
 * Generate `docs/training/role-walkthrough-matrix.md` from the App Router tree.
 *
 * For each `page.tsx` under `app/(dashboard)/org/[orgSlug]/...`, emit one row
 * with an expected outcome per canonical internal role.
 *
 * The expected outcomes are rule-based, not spec-of-record — Michael confirms
 * or corrects them during the walkthrough by filling the "Actual" column.
 *
 * Usage: tsx scripts/generate-role-matrix.ts
 */
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const ROOT = join(process.cwd(), 'app', '(dashboard)', 'org', '[orgSlug]');
const OUT = join(process.cwd(), 'docs', 'training', 'role-walkthrough-matrix.md');

const ROLES = [
  'platform_admin',
  'executive',
  'operations_manager',
  'project_manager',
  'project_coordinator',
  'estimator',
  'field_supervisor',
  'accounting',
  'payroll_admin',
] as const;

type Role = (typeof ROLES)[number];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else if (entry === 'page.tsx') out.push(full);
  }
  return out;
}

function toUrlPath(pagePath: string): string {
  const relPath = relative(ROOT, dirname(pagePath));
  if (relPath === '' || relPath === '.') return '/';
  return '/' + relPath.split(sep).join('/');
}

type Section =
  | 'home'
  | 'dashboard'
  | 'admin'
  | 'crm'
  | 'estimates'
  | 'projects'
  | 'inventory'
  | 'executive'
  | 'finance'
  | 'expenses'
  | 'payroll'
  | 'timesheets'
  | 'tasks'
  | 'schedule'
  | 'team'
  | 'portals'
  | 'contracts'
  | 'documents'
  | 'reports'
  | 'notifications'
  | 'settings'
  | 'other';

function sectionOf(url: string): Section {
  if (url === '/') return 'home';
  const top = url.split('/').filter(Boolean)[0] ?? 'other';
  if (top in ({} as Record<string, unknown>)) return 'other';
  const known: Section[] = [
    'dashboard',
    'admin',
    'crm',
    'estimates',
    'projects',
    'inventory',
    'executive',
    'finance',
    'expenses',
    'payroll',
    'timesheets',
    'tasks',
    'schedule',
    'team',
    'portals',
    'contracts',
    'documents',
    'reports',
    'notifications',
    'settings',
  ];
  return (known as string[]).includes(top) ? (top as Section) : 'other';
}

// Expected outcome per (section, role). Concise codes:
//   view    — can read/see the page
//   edit    — can read AND mutate
//   admin   — full admin control (incl. destructive ops)
//   limited — read-only or scoped to own records
//   403     — access denied / should not see this page
const MATRIX: Record<Section, Record<Role, string>> = {
  home: {
    platform_admin: 'view',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'view',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: 'view',
    accounting: 'view',
    payroll_admin: 'view',
  },
  dashboard: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'view',
    project_coordinator: 'limited',
    estimator: 'view',
    field_supervisor: 'limited',
    accounting: 'view',
    payroll_admin: 'view',
  },
  admin: {
    platform_admin: 'admin',
    executive: '403',
    operations_manager: '403',
    project_manager: '403',
    project_coordinator: '403',
    estimator: '403',
    field_supervisor: '403',
    accounting: '403',
    payroll_admin: '403',
  },
  crm: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'limited',
    estimator: 'edit',
    field_supervisor: '403',
    accounting: 'view',
    payroll_admin: '403',
  },
  estimates: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'view',
    estimator: 'edit',
    field_supervisor: '403',
    accounting: 'view',
    payroll_admin: '403',
  },
  projects: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'edit',
    estimator: 'view',
    field_supervisor: 'limited',
    accounting: 'view',
    payroll_admin: '403',
  },
  inventory: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'view',
    project_coordinator: 'view',
    estimator: '403',
    field_supervisor: 'limited',
    accounting: 'view',
    payroll_admin: '403',
  },
  executive: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: '403',
    project_manager: '403',
    project_coordinator: '403',
    estimator: '403',
    field_supervisor: '403',
    accounting: '403',
    payroll_admin: '403',
  },
  finance: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'limited',
    project_coordinator: '403',
    estimator: '403',
    field_supervisor: '403',
    accounting: 'edit',
    payroll_admin: '403',
  },
  expenses: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'limited',
    estimator: 'limited',
    field_supervisor: 'limited',
    accounting: 'edit',
    payroll_admin: '403',
  },
  payroll: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: '403',
    project_manager: '403',
    project_coordinator: '403',
    estimator: '403',
    field_supervisor: '403',
    accounting: 'view',
    payroll_admin: 'edit',
  },
  timesheets: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'edit',
    project_coordinator: 'limited',
    estimator: 'limited',
    field_supervisor: 'edit',
    accounting: 'view',
    payroll_admin: 'edit',
  },
  tasks: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'edit',
    estimator: 'view',
    field_supervisor: 'limited',
    accounting: '403',
    payroll_admin: '403',
  },
  schedule: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: 'view',
    accounting: '403',
    payroll_admin: '403',
  },
  team: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'view',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: 'view',
    accounting: 'view',
    payroll_admin: 'edit',
  },
  portals: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'view',
    estimator: '403',
    field_supervisor: '403',
    accounting: '403',
    payroll_admin: '403',
  },
  contracts: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: '403',
    accounting: 'view',
    payroll_admin: '403',
  },
  documents: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'edit',
    estimator: 'view',
    field_supervisor: 'view',
    accounting: 'view',
    payroll_admin: 'view',
  },
  reports: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'view',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: '403',
    accounting: 'view',
    payroll_admin: 'view',
  },
  notifications: {
    platform_admin: 'view',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'view',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: 'view',
    accounting: 'view',
    payroll_admin: 'view',
  },
  settings: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'limited',
    project_manager: 'limited',
    project_coordinator: 'limited',
    estimator: 'limited',
    field_supervisor: 'limited',
    accounting: 'limited',
    payroll_admin: 'limited',
  },
  other: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'view',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: 'view',
    accounting: 'view',
    payroll_admin: 'view',
  },
};

const OUTCOME_DESCRIPTION: Record<string, string> = {
  admin: 'full control incl. destructive ops',
  edit: 'read + create/update',
  view: 'read-only',
  limited: 'scoped to own records or partial read',
  '403': 'access denied / nav item hidden',
};

function expected(section: Section, role: Role): string {
  return MATRIX[section][role];
}

function render(): string {
  const pages = walk(ROOT).sort();
  const urls = pages.map(toUrlPath).sort();

  const lines: string[] = [];
  lines.push('# KrewPact Role Walkthrough Matrix');
  lines.push('');
  lines.push(`Generated from ${relative(process.cwd(), ROOT)} — ${urls.length} routes.`);
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push(
    'One row per page under `app/(dashboard)/org/[orgSlug]/...`; one column per canonical internal role. For each cell, the **Expected** outcome is the rule-based hypothesis. Sign in as each role and fill the **Actual** outcome. Mismatches are bugs or undocumented RBAC behaviour.',
  );
  lines.push('');
  lines.push('## Outcome codes');
  lines.push('');
  lines.push('| Code | Meaning |');
  lines.push('| --- | --- |');
  for (const [k, v] of Object.entries(OUTCOME_DESCRIPTION)) {
    lines.push(`| \`${k}\` | ${v} |`);
  }
  lines.push('');
  lines.push('## Roles');
  lines.push('');
  for (const r of ROLES) lines.push(`- \`${r}\``);
  lines.push('');
  lines.push('## How to walk it');
  lines.push('');
  lines.push('1. Sign in as a QA test user for each role (see `scripts/seed-qa-users.ts`).');
  lines.push('2. Walk each route listed below; note observed behaviour in the "Actual" column.');
  lines.push(
    '3. If Actual ≠ Expected, file a ticket tagged `rbac-audit` with the route + role + observation.',
  );
  lines.push(
    '4. If Expected is wrong, update the rule in `scripts/generate-role-matrix.ts` and regenerate.',
  );
  lines.push('');

  // Group URLs by section
  const grouped: Record<string, string[]> = {};
  for (const url of urls) {
    const sec = sectionOf(url);
    grouped[sec] ??= [];
    grouped[sec].push(url);
  }

  const order: Section[] = [
    'home',
    'dashboard',
    'admin',
    'crm',
    'estimates',
    'projects',
    'inventory',
    'executive',
    'finance',
    'expenses',
    'payroll',
    'timesheets',
    'tasks',
    'schedule',
    'team',
    'portals',
    'contracts',
    'documents',
    'reports',
    'notifications',
    'settings',
    'other',
  ];

  for (const sec of order) {
    const rows = grouped[sec];
    if (!rows || rows.length === 0) continue;
    lines.push(`## \`${sec}\` — ${rows.length} route${rows.length === 1 ? '' : 's'}`);
    lines.push('');

    const header = ['route', ...ROLES, ...ROLES.map((r) => `${r} actual`)];
    lines.push(`| ${header.join(' | ')} |`);
    lines.push(`| ${header.map(() => '---').join(' | ')} |`);

    for (const url of rows) {
      const cells = [
        `\`${url}\``,
        ...ROLES.map((r) => `\`${expected(sec, r)}\``),
        ...ROLES.map(() => ''),
      ];
      lines.push(`| ${cells.join(' | ')} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('_Regenerate with `tsx scripts/generate-role-matrix.ts`._');
  lines.push('');
  return lines.join('\n');
}

function main() {
  if (!existsSync(ROOT)) {
    console.error(`Route root not found: ${ROOT}`);
    process.exit(1);
  }
  const md = render();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, md, 'utf8');
  console.log(`Wrote ${OUT} (${md.split('\n').length} lines)`);
}

main();
