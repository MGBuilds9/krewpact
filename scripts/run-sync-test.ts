/**
 * One-off script to validate end-to-end ERPNext sync.
 *
 * Usage:
 *   tsx --env-file=.env.local scripts/run-sync-test.ts <projectId> [create|update|delete]
 */
import { syncProject } from '@/lib/erp/sync-handlers/sync-project';

async function main() {
  const projectId = process.argv[2];
  const op = (process.argv[3] ?? 'create') as 'create' | 'update' | 'delete';
  if (!projectId) throw new Error('usage: run-sync-test.ts <projectId> [create|update|delete]');

  console.log('[sync-test] running syncProject', { projectId, op });
  const result = await syncProject(projectId, '95b1821b-62f2-43c7-852f-17be97160cbc', {
    operation: op,
  });

  console.log('[sync-test] result', JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('[sync-test] failed', err);
  process.exit(1);
});
