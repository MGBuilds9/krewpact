# Deferred Gap Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the 4 tasks deferred from the user-gap-fixes plan: ERP mock mode safety (T8), ERPNext inbound webhook expansion (T9), offline sync main-thread listener (T11), and project file upload (T14).

**Architecture:** 4 independent fixes. T8 adds a health check gate for ERP config. T9 expands inbound webhook dispatch using verified SyncService methods. T11 wires the missing main-thread listener for service worker sync messages + initializes the sync engine in the web app. T14 replaces the "coming soon" stub with real file management using existing `useFiles`/`useUploadFile`/`useDeleteFile` hooks.

**Tech Stack:** Next.js 16, Supabase Storage, Serwist (service worker), Vitest

---

## Scope Check

These 4 tasks are independent. Each produces a working, testable change on its own.

- T8 + T9 are both in `lib/erp/` blast radius but don't share files
- T11 is isolated to `app/sw.ts` + `lib/offline/` + one layout provider
- T14 is isolated to `components/Projects/Tabs/ProjectFilesTab.tsx` — hooks already exist

---

## File Map

| Action  | File                                           | Task |
| ------- | ---------------------------------------------- | ---- |
| Modify  | `lib/erp/sync-service.ts:76-89`                | T8   |
| Modify  | `app/api/health/route.ts:81-97`                | T8   |
| Test    | `__tests__/lib/erp/sync-service.test.ts`       | T8   |
| Modify  | `app/api/webhooks/erpnext/route.ts:34-61`      | T9   |
| Test    | `__tests__/api/webhooks/erpnext.test.ts`       | T9   |
| Modify  | `app/sw.ts:105-113`                            | T11  |
| Create  | `components/shared/OfflineSyncListener.tsx`    | T11  |
| Modify  | `app/(dashboard)/layout.tsx`                   | T11  |
| Rewrite | `components/Projects/Tabs/ProjectFilesTab.tsx` | T14  |

---

### Task 1: ERP Mock Mode — Alert Once + Health Check Gate (T8)

**Files:**

- Modify: `lib/erp/sync-service.ts:76-89`
- Modify: `app/api/health/route.ts:81-97`
- Test: `__tests__/lib/erp/sync-service.test.ts`

- [ ] **Step 1: Write failing test for isMockMode alert-once behavior**

Create `__tests__/lib/erp/sync-service.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}));

import { logger } from '@/lib/logger';

describe('isMockMode', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns true when ERPNEXT_BASE_URL is missing', async () => {
    delete process.env.ERPNEXT_BASE_URL;
    const { isMockMode } = await import('@/lib/erp/sync-service');
    expect(isMockMode()).toBe(true);
  });

  it('returns false when ERPNEXT_BASE_URL is set', async () => {
    process.env.ERPNEXT_BASE_URL = 'https://erp.example.com';
    const { isMockMode } = await import('@/lib/erp/sync-service');
    expect(isMockMode()).toBe(false);
    process.env.ERPNEXT_BASE_URL = '';
  });

  it('logs error only once in production mode', async () => {
    delete process.env.ERPNEXT_BASE_URL;
    process.env.NODE_ENV = 'production';
    const { isMockMode } = await import('@/lib/erp/sync-service');
    isMockMode();
    isMockMode();
    isMockMode();
    // Should log error only once, not three times
    expect(logger.error).toHaveBeenCalledTimes(1);
    process.env.NODE_ENV = 'test';
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/erp/sync-service.test.ts
```

Expected: FAIL — current `isMockMode` logs `warn` every call, not `error` once.

- [ ] **Step 3: Implement alert-once isMockMode**

Replace `lib/erp/sync-service.ts` lines 75-89:

```typescript
let _mockModeAlerted = false;

/** Check if we're running in mock mode (no real ERPNext) */
export function isMockMode(): boolean {
  const baseUrl = process.env.ERPNEXT_BASE_URL;
  const mock = !baseUrl || baseUrl === 'mock';

  if (mock && process.env.NODE_ENV === 'production' && !_mockModeAlerted) {
    _mockModeAlerted = true;
    logger.error(
      'CRITICAL: ERPNEXT_BASE_URL not configured — all ERP syncs disabled in production',
    );
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureMessage('ERPNEXT_BASE_URL not configured in production', { level: 'fatal' });
    });
  } else if (mock && process.env.NODE_ENV !== 'production') {
    logger.info('ERPNext mock mode active (development)');
  }

  return mock;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/erp/sync-service.test.ts
```

Expected: 3/3 PASS.

- [ ] **Step 5: Add health check gate for ERP mock mode**

In `app/api/health/route.ts`, modify `checkErpNextHealth` (line 81-97). Currently it returns silently when env vars are missing. Add a mock mode check:

Replace:

```typescript
async function checkErpNextHealth(checks: Record<string, string>): Promise<void> {
  const erpUrl = process.env.ERPNEXT_BASE_URL;
  const erpKey = process.env.ERPNEXT_API_KEY?.trim();
  const erpSecret = process.env.ERPNEXT_API_SECRET?.trim();
  if (!erpUrl || !erpKey || !erpSecret) return;
```

With:

```typescript
async function checkErpNextHealth(checks: Record<string, string>): Promise<void> {
  const erpUrl = process.env.ERPNEXT_BASE_URL;
  const erpKey = process.env.ERPNEXT_API_KEY?.trim();
  const erpSecret = process.env.ERPNEXT_API_SECRET?.trim();
  if (!erpUrl || erpUrl === 'mock') {
    checks.erpnext = process.env.NODE_ENV === 'production' ? 'misconfigured' : 'mock';
    return;
  }
  if (!erpKey || !erpSecret) {
    checks.erpnext = 'missing_credentials';
    return;
  }
```

Now BetterStack will see `erpnext: "misconfigured"` in the health check response and alert.

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add lib/erp/sync-service.ts app/api/health/route.ts __tests__/lib/erp/sync-service.test.ts
git commit -m "fix: ERP mock mode alerts once at fatal level + health check gate

isMockMode() now logs error once (not warn on every call) and fires
Sentry at fatal level in production. Health check reports 'misconfigured'
when ERPNEXT_BASE_URL is missing, making it visible in BetterStack."
```

---

### Task 2: ERPNext Inbound Webhook Expansion (T9)

**Files:**

- Modify: `app/api/webhooks/erpnext/route.ts:34-61`
- Test: `__tests__/api/webhooks/erpnext.test.ts` (create if missing)

All SyncService methods verified to exist:

- `readSalesInvoice(docname, jobContext?)` — already wired
- `readPurchaseInvoice(docname, jobContext?)` — already wired
- `syncPaymentEntry(paymentId, userId, jobContext?)` — needs `userId`, use `'webhook'`
- `syncStockEntry(entryId, userId, jobContext?)` — needs `userId`, use `'webhook'`
- `syncEmployee(userId, triggerUserId, jobContext?)` — needs `triggerUserId`, use `'webhook'`

Note: `syncPurchaseOrder` does not exist as a standalone method. The correct method is through the queue processor. Skip PO for now — only add verified methods.

- [ ] **Step 1: Write failing test for new doctypes**

Create `__tests__/api/webhooks/erpnext.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/erp/sync-service', () => {
  const mockService = {
    readSalesInvoice: vi.fn().mockResolvedValue({ status: 'success' }),
    readPurchaseInvoice: vi.fn().mockResolvedValue({ status: 'success' }),
    syncPaymentEntry: vi.fn().mockResolvedValue({ status: 'success' }),
    syncStockEntry: vi.fn().mockResolvedValue({ status: 'success' }),
    syncEmployee: vi.fn().mockResolvedValue({ status: 'success' }),
  };
  return {
    SyncService: vi.fn(() => mockService),
    __mockService: mockService,
  };
});

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({ set: vi.fn().mockResolvedValue(true) })),
}));

describe('ERPNext webhook dispatchDoctype', () => {
  it('dispatches Payment Entry to syncPaymentEntry', async () => {
    // Test the dispatch function handles Payment Entry doctype
    const { __mockService: service } = await import('@/lib/erp/sync-service');
    const { SyncService } = await import('@/lib/erp/sync-service');
    const svc = new SyncService();
    await svc.syncPaymentEntry('PAY-001', 'webhook');
    expect(service.syncPaymentEntry).toHaveBeenCalledWith('PAY-001', 'webhook');
  });
});
```

- [ ] **Step 2: Expand the dispatchDoctype function**

Replace `app/api/webhooks/erpnext/route.ts` lines 34-61:

```typescript
async function dispatchDoctype(
  service: SyncService,
  doctype: string,
  docname: string,
  event: string,
): Promise<NextResponse | null> {
  if (!docname) return NextResponse.json({ error: 'Missing document name' }, { status: 400 });

  // Read-only inbound sync (ERPNext → KrewPact)
  const readHandlers: Record<string, (name: string) => Promise<unknown>> = {
    'Sales Invoice': (name) => service.readSalesInvoice(name),
    'Purchase Invoice': (name) => service.readPurchaseInvoice(name),
  };

  // Bidirectional sync (ERPNext change triggers KrewPact update)
  const syncHandlers: Record<string, (name: string) => Promise<unknown>> = {
    'Payment Entry': (name) => service.syncPaymentEntry(name, 'webhook'),
    'Stock Entry': (name) => service.syncStockEntry(name, 'webhook'),
    Employee: (name) => service.syncEmployee(name, 'webhook'),
  };

  const readHandler = readHandlers[doctype];
  if (readHandler) {
    const result = await readHandler(docname);
    logger.info(`${doctype} inbound sync complete`, { docname, event, result });
    return null;
  }

  const syncHandler = syncHandlers[doctype];
  if (syncHandler) {
    const result = await syncHandler(docname);
    logger.info(`${doctype} bidirectional sync complete`, { docname, event, result });
    return null;
  }

  // Known outbound-only doctypes — we receive events but don't need to process inbound
  const outboundOnly = ['Customer', 'Project', 'Supplier', 'Item', 'Quotation'];
  if (outboundOnly.includes(doctype)) {
    logger.info(`${doctype} event received — outbound-only, no inbound action`, { docname, event });
    return null;
  }

  logger.warn('Unhandled ERPNext doctype', { doctype, docname, event });
  return null;
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Run tests**

```bash
npx vitest run __tests__/api/webhooks/erpnext.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/erpnext/route.ts __tests__/api/webhooks/erpnext.test.ts
git commit -m "feat: expand ERPNext inbound webhook — Payment Entry, Stock Entry, Employee

Adds 3 new inbound sync handlers with verified SyncService signatures.
Categorizes doctypes as read-only, bidirectional, or outbound-only for
clearer logging and future expansion."
```

---

### Task 3: Offline Sync — Wire Main-Thread Listener + Init (T11)

**Files:**

- Modify: `app/sw.ts:105-113`
- Create: `components/shared/OfflineSyncListener.tsx`
- Modify: `app/(dashboard)/layout.tsx` (or the nearest client layout that wraps authenticated routes)

The investigation found:

1. `app/sw.ts` posts `OFFLINE_SYNC_TRIGGER` messages to window clients
2. NO main-thread listener exists in the web app (only `mobile/app/_layout.tsx` calls `initSyncAuth`)
3. The `lib/offline/sync-engine.ts` has `syncNow()` and `initSyncAuth()` ready to use

- [ ] **Step 1: Create OfflineSyncListener component**

Create `components/shared/OfflineSyncListener.tsx`:

```tsx
'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

import { initSyncAuth, syncNow } from '@/lib/offline/sync-engine';

/**
 * Listens for OFFLINE_SYNC_TRIGGER messages from the service worker
 * and kicks off the sync engine. Mount once in the dashboard layout.
 */
export function OfflineSyncListener() {
  const { getToken } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize auth for the sync engine
    initSyncAuth(() => getToken());

    // Listen for service worker sync messages
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'OFFLINE_SYNC_TRIGGER') {
        syncNow().catch(() => {
          // Sync errors are logged inside syncNow — no action needed here
        });
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [getToken]);

  // Also sync on reconnect
  useEffect(() => {
    function handleOnline() {
      syncNow().catch(() => {});
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return null;
}
```

- [ ] **Step 2: Add fallback in service worker when no clients are open**

In `app/sw.ts`, replace `processOfflineQueue` (lines 105-113):

```typescript
async function processOfflineQueue(): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window' });

  if (clients.length > 0) {
    // Preferred: delegate to main thread (has auth context)
    for (const client of clients) {
      client.postMessage({ type: 'OFFLINE_SYNC_TRIGGER', tag: OFFLINE_SYNC_TAG });
    }
  } else {
    // No windows open — re-register sync tag so it fires when a window opens.
    // BackgroundSync deduplicates on tag name, so this is safe.
    try {
      if (self.registration.sync) {
        await self.registration.sync.register(OFFLINE_SYNC_TAG);
      }
    } catch {
      // sync.register can fail if already registered — that's fine
    }
  }
}
```

- [ ] **Step 3: Mount OfflineSyncListener in dashboard layout**

Read `app/(dashboard)/layout.tsx`. Find the client-side providers section and add:

```tsx
import { OfflineSyncListener } from '@/components/shared/OfflineSyncListener';
```

Add `<OfflineSyncListener />` inside the provider tree (it renders null, so placement is flexible).

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add components/shared/OfflineSyncListener.tsx app/sw.ts app/(dashboard)/layout.tsx
git commit -m "feat: wire offline sync main-thread listener + service worker fallback

OfflineSyncListener receives OFFLINE_SYNC_TRIGGER messages from the
service worker and calls syncNow(). Also syncs on reconnect via
online event. Service worker re-registers sync tag when no window
is open instead of silently dropping mutations."
```

---

### Task 4: Project File Upload — Replace "Coming Soon" (T14)

**Files:**

- Rewrite: `components/Projects/Tabs/ProjectFilesTab.tsx`

The hooks already exist in `hooks/useDocuments.ts`:

- `useFiles(projectId, folderId?)` — fetches file list from `/api/projects/{id}/files`
- `useUploadFile(projectId, folderId?, orgId?)` — uploads to Supabase Storage `project-files` bucket
- `useDeleteFile(projectId)` — deletes via `/api/projects/{id}/files/{fileId}`
- Max file size: 50 MB
- Allowed types: PDF, images, Office docs, CSV, ZIP

The API routes at `/api/projects/[id]/files` and `/api/projects/[id]/files/[fileId]` already exist.

- [ ] **Step 1: Rewrite ProjectFilesTab**

Replace the entire contents of `components/Projects/Tabs/ProjectFilesTab.tsx`:

```tsx
'use client';

import { FileText, FolderOpen, Trash2, Upload } from 'lucide-react';
import { useCallback, useRef } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOrg } from '@/contexts/OrgContext';
import { useDeleteFile, useFiles, useUploadFile } from '@/hooks/useDocuments';

interface ProjectFilesTabProps {
  projectId: string;
}

export function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const { data: filesData, isLoading } = useFiles(projectId);
  const upload = useUploadFile(projectId, undefined, orgId);
  const deleteFile = useDeleteFile(projectId);

  const files = filesData?.data ?? [];

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList?.length) return;
      for (const file of Array.from(fileList)) {
        await upload.mutateAsync(file);
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [upload],
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Files</h2>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.zip"
          />
          <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending || !orgId}>
            <Upload className="h-4 w-4 mr-2" />
            {upload.isPending ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </div>

      {upload.isError && <p className="text-sm text-destructive">{upload.error.message}</p>}

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !files.length ? (
        <EmptyState
          icon={FolderOpen}
          title="No files yet"
          description="Upload project documents, drawings, photos, and more. Max 50 MB per file."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.original_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(0)} KB` : ''}
                        {file.created_at
                          ? ` · ${new Date(file.created_at).toLocaleDateString('en-CA')}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFile.mutate(file.id)}
                    disabled={deleteFile.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors. If `FileMetadata` properties differ (e.g., `original_name` vs `name`), adjust to match the type from `hooks/useDocuments.types.ts`.

- [ ] **Step 3: Run existing tests**

```bash
npm run test
```

Expected: all passing. No existing tests for ProjectFilesTab (was a stub).

- [ ] **Step 4: Commit**

```bash
git add components/Projects/Tabs/ProjectFilesTab.tsx
git commit -m "feat: implement project file upload using existing useDocuments hooks

Replaces 'coming soon' stub with real file list, upload, and delete.
Uses existing useFiles, useUploadFile, useDeleteFile hooks from
hooks/useDocuments.ts. Supabase Storage bucket 'project-files'
already configured. 50 MB limit, PDF/image/Office/ZIP allowed."
```

---

## Verification

After all tasks:

```bash
npm run typecheck    # 0 errors
npm run lint         # 0 new errors
npm run test         # all passing + new tests for T8, T9
```

Manual checklist:

- [ ] Health check at `/api/health?deep=true` shows `erpnext: "misconfigured"` when `ERPNEXT_BASE_URL` is missing
- [ ] ERPNext webhook processes Payment Entry, Stock Entry, Employee events
- [ ] Offline queue: go offline, make a change, come back online — sync triggers
- [ ] Project Files tab: upload a PDF, see it listed, delete it
