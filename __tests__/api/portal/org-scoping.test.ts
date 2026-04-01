import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Portal API org scoping', () => {
  const portalRouteFiles = [
    'app/api/portal/projects/route.ts',
    'app/api/portal/trade/tasks/route.ts',
    'app/api/portal/trade/bids/route.ts',
    'app/api/portal/trade/compliance/route.ts',
    'app/api/portal/trade/submittals/route.ts',
    'app/api/portal/trade/site-logs/route.ts',
  ];

  it.each(portalRouteFiles)('%s uses createUserClientSafe (not service client)', (file) => {
    const content = fs.readFileSync(path.resolve(file), 'utf-8');
    expect(content).toContain('createUserClientSafe');
    expect(content).not.toContain('createServiceClient');
  });

  it('portal write-path RLS migration exists with RESTRICTIVE policies', () => {
    const migration = fs.readFileSync(
      path.resolve('supabase/migrations/20260401_003_portal_rls_write_org_scope.sql'),
      'utf-8',
    );
    expect(migration).toContain('portal_accounts_org_restrict_insert');
    expect(migration).toContain('portal_permissions_org_restrict_insert');
    expect(migration).toContain('portal_messages_org_restrict_insert');
    expect(migration).toContain('portal_view_logs_org_restrict_insert');
    expect(migration).toContain('RESTRICTIVE');
    expect(migration).toContain('krewpact_org_id()');
  });
});
