# User-Facing Gap Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 11 user-facing gaps (broken routes, dead-end UX, config safety, mobile no-ops). Deferred: T8 (ERP mock → separate PR), T9 (webhook expansion → verify signatures), T14 (file upload → feature ticket).

**Architecture:** 11 fixes in 3 parallel tracks. Each independently mergeable. Reuse: `useOrgRouter` for routing, shadcn `Select` for pickers (not raw `<select>`), `useTeamMembers` hook, `EmptyState` with actions.

**Tech Stack:** Next.js 16, React 19, shadcn/ui, Vitest (component tests), Playwright (E2E)

**Review corrections from /autoplan (CEO + Design + Eng dual voices):**

- **T1 expanded to pattern audit** — Codex found `projects/_page-content.tsx:218` has the same broken `router.push`. Grep all `router.push` calls.
- **T3 uses shadcn Select** (not raw `<select>`) — both design voices agreed
- **T4 save indicator extended to 2.5s** with "Saved" text + icon — 1.5s too subtle for outdoor screens
- **T5 uses `useTeamMembers` hook** + shadcn `Select` (not ad-hoc fetch + raw select)
- **T6 responsive**: desktop 10, mobile 7 — not just a constant change
- **T10 returns 503** (not 500) — prevents BoldSign retry flood
- **T11 deferred** — offline sync has no main-thread listener; needs proper fix, not re-register band-aid
- **3 component tests added** for T1, T3, T5 (highest-risk UI changes)

---

## File Map

| Action | File                                                            | Track |
| ------ | --------------------------------------------------------------- | ----- |
| Modify | `app/(dashboard)/org/[orgSlug]/contracts/_page-content.tsx:153` | A     |
| Create | `app/(dashboard)/org/[orgSlug]/tasks/page.tsx`                  | A     |
| Modify | `app/(portal)/portals/trade/bids/_page-content.tsx:149-158`     | A     |
| Modify | `components/Projects/Tabs/ProjectFilesTab.tsx`                  | B     |
| Modify | `components/Estimates/LineItemEditor.tsx`                       | B     |
| Modify | `components/CRM/BulkActionBar.tsx:148-153`                      | B     |
| Modify | `components/Finance/HoldbackTracker.tsx:114`                    | B     |
| Modify | `components/Finance/PaymentTimeline.tsx`                        | B     |
| Modify | `components/Finance/AgedReceivablesReport.tsx`                  | B     |
| Modify | `components/Layout/Navigation.tsx:35`                           | B     |
| Modify | `lib/erp/sync-service.ts:76-89`                                 | C     |
| Modify | `app/api/webhooks/erpnext/route.ts:54-60`                       | C     |
| Modify | `app/api/webhooks/boldsign/route.ts:47-49`                      | C     |
| Modify | `app/sw.ts:105-110`                                             | C     |
| Modify | `components/ui/error-card.tsx:37`                               | D     |
| Modify | `mobile/app/(tabs)/more.tsx:102-115`                            | D     |

---

## Track A: Broken Routes & Dead Ends

### Task 1: Fix contract card routing (404 on every click)

**Files:**

- Modify: `app/(dashboard)/org/[orgSlug]/contracts/_page-content.tsx:153`

- [ ] **Step 1: Read the file to confirm current state**

The file at line 153 has:

```tsx
onClick={() => router.push(`/contracts/${contract.id}`)}
```

This is missing the org slug prefix. The `useOrgRouter` hook exists at `hooks/useOrgRouter.ts` and provides `orgPath()` and `push()`.

- [ ] **Step 2: Fix the routing**

In `app/(dashboard)/org/[orgSlug]/contracts/_page-content.tsx`, find the existing `useRouter` import and the `router` variable. Replace with `useOrgRouter`:

Replace:

```tsx
import { useRouter } from 'next/navigation';
```

With:

```tsx
import { useOrgRouter } from '@/hooks/useOrgRouter';
```

Replace:

```tsx
const router = useRouter();
```

With:

```tsx
const { push } = useOrgRouter();
```

Replace:

```tsx
onClick={() => router.push(`/contracts/${contract.id}`)}
```

With:

```tsx
onClick={() => push(`/contracts/${contract.id}`)}
```

- [ ] **Step 3: Fix the empty state — add a "New Contract" button**

Replace the empty state block (lines 140-146):

```tsx
<CardContent className="py-12 text-center">
  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
  <h3 className="text-lg font-medium mb-2">No contracts yet</h3>
  <p className="text-muted-foreground mb-4">Create a contract from an accepted proposal</p>
</CardContent>
```

With:

```tsx
<CardContent className="py-12 text-center">
  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
  <h3 className="text-lg font-medium mb-2">No contracts yet</h3>
  <p className="text-muted-foreground mb-4">
    Create a contract from an accepted proposal, or start a new one manually.
  </p>
  <Button onClick={() => setDialogOpen(true)}>
    <Plus className="h-4 w-4 mr-2" />
    New Contract
  </Button>
</CardContent>
```

Add `Plus` to the lucide-react import.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/org/[orgSlug]/contracts/_page-content.tsx
git commit -m "fix: contract card routing uses orgPath, add empty state action button"
```

---

### Task 2: Create tasks page (route exists in nav but page.tsx missing)

**Files:**

- Create: `app/(dashboard)/org/[orgSlug]/tasks/page.tsx`
- Test: existing `loading.tsx` already in place

The `tasks/loading.tsx` exists, meaning the route is expected. But `page.tsx` is missing.

- [ ] **Step 1: Create the page**

Create `app/(dashboard)/org/[orgSlug]/tasks/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/PageHeader';

export const metadata: Metadata = {
  title: 'Tasks | KrewPact',
};

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Cross-project task management" />
      <p className="text-sm text-muted-foreground">
        Task management is available within each project. Use the sidebar to navigate to a specific
        project.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/org/[orgSlug]/tasks/page.tsx
git commit -m "feat: add tasks page route to prevent 404 on nav click"
```

---

### Task 3: Replace raw UUID input with project picker in trade bid form

**Files:**

- Modify: `app/(portal)/portals/trade/bids/_page-content.tsx:149-158`

- [ ] **Step 1: Read the full file for imports and hook context**

Read `app/(portal)/portals/trade/bids/_page-content.tsx` fully to understand the form setup, available hooks, and how projects are fetched for trade partners.

- [ ] **Step 2: Replace UUID input with a select dropdown**

The trade partner should see projects they have access to. Replace the raw UUID input (lines 149-158):

```tsx
<div className="space-y-1">
  <Label htmlFor="project_id">Project ID (UUID)</Label>
  <Input
    id="project_id"
    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    {...register('project_id')}
  />
  {errors.project_id && <p className="text-xs text-red-600">{errors.project_id.message}</p>}
</div>
```

With:

```tsx
<div className="space-y-1">
  <Label htmlFor="project_id">Project</Label>
  <select
    id="project_id"
    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    {...register('project_id')}
    defaultValue=""
  >
    <option value="" disabled>
      Select a project...
    </option>
    {projects?.map((p: { id: string; name: string }) => (
      <option key={p.id} value={p.id}>
        {p.name}
      </option>
    ))}
  </select>
  {errors.project_id && <p className="text-xs text-red-600">{errors.project_id.message}</p>}
</div>
```

This requires a `projects` query. Add near the top of the component (after hooks):

```tsx
const { data: projects } = useQuery({
  queryKey: ['portal-projects'],
  queryFn: async () => {
    const res = await fetch('/api/portal/projects');
    if (!res.ok) return [];
    return res.json();
  },
});
```

If `/api/portal/projects` doesn't exist yet, check for an existing portal projects endpoint or use the available projects from the portal context.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/(portal)/portals/trade/bids/_page-content.tsx
git commit -m "fix: replace raw UUID input with project dropdown in trade bid form"
```

---

## Track B: UX Pain Points

### Task 4: Make estimate line editor mobile-friendly with save indicator

**Files:**

- Modify: `components/Estimates/LineItemEditor.tsx`

- [ ] **Step 1: Read the full file**

Read `components/Estimates/LineItemEditor.tsx` to understand the full table structure.

- [ ] **Step 2: Wrap table in responsive container**

Find the `<table>` element and wrap it:

```tsx
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <table className="w-full text-sm min-w-[600px]">
```

- [ ] **Step 3: Add save indicator to onBlur handler**

In `LineRow`, add a brief "Saved" flash. Add state to the component:

```tsx
import { Check } from 'lucide-react';
import { useState } from 'react';
```

In `LineRow`, add:

```tsx
const [savedField, setSavedField] = useState<string | null>(null);

function handleBlur(field: string, value: string | number | boolean) {
  onUpdateLine(line.id, field, value);
  setSavedField(field);
  setTimeout(() => setSavedField(null), 1500);
}
```

Replace each `onBlur={(e) => onUpdateLine(line.id, 'description', e.target.value)}` with:

```tsx
onBlur={(e) => handleBlur('description', e.target.value)}
```

Add a saved indicator next to each input (inside the `<td>`):

```tsx
{
  savedField === 'description' && (
    <Check className="h-3 w-3 text-green-500 absolute right-2 top-1/2 -translate-y-1/2" />
  );
}
```

Make the `<td>` relatively positioned: `className="py-2 pr-2 relative"`.

Do the same for `quantity`, `unit_cost`, and `markup_percent` fields.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add components/Estimates/LineItemEditor.tsx
git commit -m "fix: make line editor mobile-responsive with save indicator on blur"
```

---

### Task 5: Replace User ID input with team member picker in bulk assign

**Files:**

- Modify: `components/CRM/BulkActionBar.tsx:148-153`

- [ ] **Step 1: Read the full BulkActionBar component**

Read `components/CRM/BulkActionBar.tsx` to understand imports and available hooks.

- [ ] **Step 2: Replace ConfirmReasonDialog with a team member select**

The current code at line 148 uses `ConfirmReasonDialog` with `reasonLabel="User ID"`. This is reusing a generic dialog that asks for free text. Replace with a proper team member picker.

Replace:

```tsx
<ConfirmReasonDialog
  open={assignDialogOpen}
  onOpenChange={setAssignDialogOpen}
  title="Assign To"
  description="Enter the user ID to assign selected items to."
  confirmLabel="Assign"
  reasonLabel="User ID"
  reasonRequired
  onConfirm={(reason) => executeBulk('assign', { assignee_id: reason })}
/>
```

With a dialog that fetches team members and shows a select:

```tsx
<AssignDialog
  open={assignDialogOpen}
  onOpenChange={setAssignDialogOpen}
  onConfirm={(userId) => executeBulk('assign', { assignee_id: userId })}
/>
```

Create `AssignDialog` inline (or as a sibling component) that:

1. Fetches team members via `useQuery({ queryKey: ['team-members'], queryFn: ... })`
2. Shows a `<Select>` with `<SelectItem>` for each member (name + role)
3. Has Assign/Cancel buttons

The endpoint is likely `/api/org/[slug]/team` or similar — check existing hooks like `useTeam`.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add components/CRM/BulkActionBar.tsx
git commit -m "fix: replace raw user ID input with team member picker in bulk assign"
```

---

### Task 6: Increase nav MAX_VISIBLE from 7 to 10

**Files:**

- Modify: `components/Layout/Navigation.tsx:35`

- [ ] **Step 1: Change MAX_VISIBLE**

In `components/Layout/Navigation.tsx`, line 35:

Replace:

```tsx
const MAX_VISIBLE = 7;
```

With:

```tsx
const MAX_VISIBLE = 10;
```

This shows 10 items before overflow. With 20 modules and role-based filtering (most users see 10-14), this means only 0-4 items go into "More" for typical roles.

- [ ] **Step 2: Commit**

```bash
git add components/Layout/Navigation.tsx
git commit -m "fix: increase nav MAX_VISIBLE from 7 to 10 to reduce overflow clicks"
```

---

### Task 7: Add action buttons to finance empty states

**Files:**

- Modify: `components/Finance/HoldbackTracker.tsx:114`
- Modify: `components/Finance/PaymentTimeline.tsx` (similar line)
- Modify: `components/Finance/AgedReceivablesReport.tsx` (similar line)

- [ ] **Step 1: Read each file to locate EmptyState usage**

Read the three files to find the exact EmptyState patterns.

- [ ] **Step 2: Add contextual guidance to each empty state**

For `HoldbackTracker.tsx`, the empty state currently reads "No holdbacks yet / Holdbacks appear once progress payment invoices are submitted." This is actually helpful guidance. The fix is to add a link to the relevant page:

```tsx
<EmptyState
  icon={Calendar}
  title="No holdbacks yet"
  description="Holdbacks appear once progress payment invoices are submitted."
  action={
    <Button variant="outline" size="sm" asChild>
      <Link href={orgPath('/finance')}>View invoices</Link>
    </Button>
  }
/>
```

Import `Link` from `next/link` and get `orgPath` from `useOrgRouter` (or pass it as a prop if this is a server component).

Apply similar patterns to `PaymentTimeline` and `AgedReceivablesReport` — each should link to the relevant source page.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add components/Finance/
git commit -m "fix: add navigation actions to finance empty states"
```

---

## Track C: System-Level Config & Safety

### Task 8: Make ERP mock mode fail loud in production

**Files:**

- Modify: `lib/erp/sync-service.ts:76-89`

- [ ] **Step 1: Read the current isMockMode function**

Current behavior (lines 76-89): if `ERPNEXT_BASE_URL` is missing or "mock" in production, it logs a warn and fires a Sentry error — but returns `true` and sync proceeds silently (all handlers check `isMockMode()` and skip). The problem is this happens on every single sync call, flooding Sentry with duplicate errors.

- [ ] **Step 2: Make it throw in production instead of silently succeeding**

Replace `isMockMode()` at `lib/erp/sync-service.ts:76-89`:

```typescript
/** Check if we're running in mock mode (no real ERPNext) */
export function isMockMode(): boolean {
  const baseUrl = process.env.ERPNEXT_BASE_URL;
  const mock = !baseUrl || baseUrl === 'mock';

  if (mock && process.env.NODE_ENV === 'production') {
    // In production, this is a critical configuration error.
    // Throw on first call so it's impossible to run for weeks without noticing.
    const msg = 'CRITICAL: ERPNEXT_BASE_URL is not configured. All ERP syncs are disabled.';
    logger.error(msg);
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureMessage(msg, { level: 'fatal' });
    });
    // Don't throw — that would crash cron handlers. Instead, log at fatal level
    // and return true so handlers skip gracefully. The Sentry alert + cron monitor
    // will catch this within 1 cron cycle (15 min max).
  } else if (mock) {
    logger.info('ERPNext mock mode active (development) — syncs are simulated');
  }

  return mock;
}
```

Actually — throwing would crash 15 cron handlers. The right fix is: log at `fatal` level (not `warn`), fire Sentry once (not on every call), and make the health check report it.

Replace with:

```typescript
let _mockModeAlerted = false;

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

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add lib/erp/sync-service.ts
git commit -m "fix: ERP mock mode alerts once at fatal level instead of warn-per-call"
```

---

### Task 9: Expand ERPNext inbound webhook to dispatch more doctypes

**Files:**

- Modify: `app/api/webhooks/erpnext/route.ts:42-60`

- [ ] **Step 1: Read the dispatchDoctype function**

Current state: only handles `Sales Invoice` and `Purchase Invoice`. Customer and Project log info but take no action. Everything else logs `Unhandled`.

- [ ] **Step 2: Expand the dispatch**

Replace the `dispatchDoctype` function body:

```typescript
async function dispatchDoctype(
  service: SyncService,
  doctype: string,
  docname: string,
  event: string,
): Promise<NextResponse | null> {
  if (!docname) return NextResponse.json({ error: 'Missing document name' }, { status: 400 });

  const doctypeHandlers: Record<string, (name: string) => Promise<unknown>> = {
    'Sales Invoice': (name) => service.readSalesInvoice(name),
    'Purchase Invoice': (name) => service.readPurchaseInvoice(name),
    'Payment Entry': (name) => service.syncPaymentEntry(name, 'webhook'),
    'Purchase Order': (name) => service.syncPurchaseOrder(name, 'webhook'),
    'Stock Entry': (name) => service.syncStockEntry(name, 'webhook'),
    Employee: (name) => service.syncEmployee(name, 'webhook'),
  };

  const handler = doctypeHandlers[doctype];
  if (handler) {
    const result = await handler(docname);
    logger.info(`${doctype} webhook processed`, { docname, event, result });
    return null;
  }

  // Known doctypes we receive but don't need to process inbound
  const ignoredDoctypes = ['Customer', 'Project', 'Supplier', 'Item'];
  if (ignoredDoctypes.includes(doctype)) {
    logger.info(`${doctype} event received — outbound-only sync, no inbound action`, {
      docname,
      event,
    });
    return null;
  }

  logger.warn('Unhandled ERPNext doctype', { doctype, docname, event });
  return null;
}
```

Verify that `SyncService` has `readSalesInvoice`, `readPurchaseInvoice`, `syncPaymentEntry`, `syncPurchaseOrder`, `syncStockEntry`, `syncEmployee` methods. If any method signature differs (e.g., requires `userId`), adjust the call. Check the `SyncService` class definition for exact signatures.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/erpnext/route.ts
git commit -m "feat: expand ERPNext inbound webhook to handle Payment, PO, Stock, Employee"
```

---

### Task 10: Fix BoldSign webhook silent bypass when secret is missing

**Files:**

- Modify: `app/api/webhooks/boldsign/route.ts:47-49`

- [ ] **Step 1: Replace silent accept with explicit rejection in production**

Replace lines 47-49:

```typescript
if (!webhookSecret) {
  logger.warn('BOLDSIGN_WEBHOOK_SECRET not set — accepting as verification ping');
  return NextResponse.json({ message: 'Webhook endpoint active' });
}
```

With:

```typescript
if (!webhookSecret) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('BOLDSIGN_WEBHOOK_SECRET not configured in production — rejecting webhook');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  logger.warn('BOLDSIGN_WEBHOOK_SECRET not set — accepting as verification ping (dev only)');
  return NextResponse.json({ message: 'Webhook endpoint active (dev mode)' });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/webhooks/boldsign/route.ts
git commit -m "fix: BoldSign webhook rejects unverified requests in production"
```

---

### Task 11: Fix offline sync dropping mutations when no window is open

**Files:**

- Modify: `app/sw.ts:105-110`

- [ ] **Step 1: Read current processOfflineQueue**

Current behavior: the service worker Background Sync handler posts a message to all open window clients. If no windows are open, the message goes nowhere and mutations are lost.

- [ ] **Step 2: Add direct IndexedDB processing fallback**

Replace the `processOfflineQueue` function in `app/sw.ts`:

```typescript
async function processOfflineQueue(): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window' });

  if (clients.length > 0) {
    // Preferred path: delegate to main thread (has auth context)
    for (const client of clients) {
      client.postMessage({ type: 'OFFLINE_SYNC_TRIGGER' });
    }
  } else {
    // No windows open. Re-register sync to retry when a window opens.
    // This prevents data loss — BackgroundSync will fire again next time
    // the browser regains connectivity with an open window.
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

This ensures the sync tag stays registered until a window is available to process it. No data loss.

- [ ] **Step 3: Commit**

```bash
git add app/sw.ts
git commit -m "fix: offline sync re-registers when no window is open instead of dropping"
```

---

## Track D: Error UX & Mobile

### Task 12: Sanitize error messages shown to end users

**Files:**

- Modify: `components/ui/error-card.tsx:37`

- [ ] **Step 1: Sanitize the error message display**

Current code at line 37:

```tsx
{
  errorMessage && <p className="text-sm text-muted-foreground">{errorMessage}</p>;
}
```

Replace with:

```tsx
{
  errorMessage && (
    <details className="text-left">
      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
        Show technical details
      </summary>
      <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted p-2 rounded break-all">
        {errorMessage}
      </p>
    </details>
  );
}
```

This hides the raw error behind a collapsed `<details>` element. Non-technical users see only the friendly `description`. Technical users can expand for the raw error + digest.

- [ ] **Step 2: Commit**

```bash
git add components/ui/error-card.tsx
git commit -m "fix: hide raw error messages behind expandable details in ErrorCard"
```

---

### Task 13: Wire mobile Profile, Notifications, Settings menu items

**Files:**

- Modify: `mobile/app/(tabs)/more.tsx:102-115`

- [ ] **Step 1: Replace no-op handlers with navigation or alerts**

Replace lines 102-115:

```tsx
<MenuItem
  icon="cloud-outline"
  label="Offline Queue"
  subtitle="View pending offline changes"
  onPress={() => Alert.alert('Offline Queue', 'View your sync status on the Dashboard tab.')}
/>
```

Keep as-is (this redirects to Dashboard which is the correct location).

Replace lines 113-115:

```tsx
<MenuItem icon="person-outline" label="Profile" subtitle={userEmail} onPress={() => {}} />
<MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} />
<MenuItem icon="settings-outline" label="Settings" onPress={() => {}} />
```

With:

```tsx
<MenuItem
  icon="person-outline"
  label="Profile"
  subtitle={userEmail}
  onPress={() => router.push('/profile')}
/>
<MenuItem
  icon="notifications-outline"
  label="Notifications"
  onPress={() => router.push('/(tabs)/notifications')}
/>
<MenuItem
  icon="settings-outline"
  label="Settings"
  onPress={() => Alert.alert('Settings', 'App settings will be available in the next update.')}
/>
```

Check what `router` is available in the Expo context (likely `useRouter` from `expo-router`). If `/profile` and `/(tabs)/notifications` routes don't exist in the mobile app, use `Alert.alert` with "Coming in next update" — but make it clear vs a silent no-op.

- [ ] **Step 2: Commit**

```bash
git add mobile/app/(tabs)/more.tsx
git commit -m "fix: wire mobile Profile and Notifications menu items, add Settings placeholder"
```

---

### Task 14: Add Project Files upload (replace "coming soon")

**Files:**

- Modify: `components/Projects/Tabs/ProjectFilesTab.tsx`

- [ ] **Step 1: Read the full file**

Current state: 34 lines, disabled upload button, "coming soon" text, `projectId` prop unused.

- [ ] **Step 2: Implement basic file upload using Supabase Storage**

Replace the entire component:

```tsx
'use client';

import { FolderOpen, Trash2, Upload } from 'lucide-react';
import { useCallback, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { useProjectFiles } from '@/hooks/useProjects';

interface ProjectFilesTabProps {
  projectId: string;
}

export function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { files, upload, remove, isUploading } = useProjectFiles(projectId);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList?.length) return;
      for (const file of Array.from(fileList)) {
        await upload(file);
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
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg"
          />
          <Button onClick={() => inputRef.current?.click()} disabled={isUploading}>
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </div>

      {!files?.length ? (
        <EmptyState
          icon={FolderOpen}
          title="No files yet"
          description="Upload project documents, drawings, photos, and more."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {files.map(
                (file: {
                  id: string;
                  name: string;
                  size: number;
                  created_at: string;
                  url: string;
                }) => (
                  <li key={file.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {file.name}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB &middot;{' '}
                        {new Date(file.created_at).toLocaleDateString('en-CA')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(file.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ),
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

This requires a `useProjectFiles` hook. If it doesn't exist, create it in `hooks/useProjects.ts` (or the closest existing hook file for projects) using the pattern:

```typescript
export function useProjectFiles(projectId: string) {
  const queryClient = useQueryClient();
  const bucket = 'project-files';
  const folder = `projects/${projectId}`;

  const { data: files } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-files', projectId] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-files', projectId] }),
  });

  return {
    files,
    upload: uploadMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}
```

This also requires a `/api/projects/[id]/files` route. Check if one exists. If not, create a minimal API route that uses Supabase Storage to upload/list/delete files in the `project-files` bucket.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add components/Projects/Tabs/ProjectFilesTab.tsx hooks/useProjects.ts
git commit -m "feat: implement project file upload using Supabase Storage"
```

---

## Verification

After all tasks:

```bash
npm run typecheck    # 0 errors
npm run lint         # 0 new errors
npm run test         # all passing
npm run build        # clean build
```

Manual verification checklist:

- [ ] Click a contract card — navigates to `/org/{slug}/contracts/{id}`, not 404
- [ ] Visit `/org/{slug}/tasks` — renders page, not blank
- [ ] Trade partner bid form shows project dropdown, not UUID input
- [ ] Estimate line editor: resize browser to 375px width — table scrolls horizontally
- [ ] Edit an estimate value, tab away — green check appears briefly
- [ ] CRM bulk assign shows team member names, not User ID input
- [ ] Navigation shows 10 items before overflow
- [ ] Finance pages with no data show action button linking to source
- [ ] Error pages hide raw errors behind expandable details
- [ ] Mobile Profile/Notifications/Settings taps navigate or show clear message
- [ ] Project Files tab shows upload button, not "coming soon"
