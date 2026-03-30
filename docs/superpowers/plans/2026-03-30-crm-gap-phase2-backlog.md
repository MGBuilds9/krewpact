# CRM Gap-Hunter Phase 2 Backlog Elimination

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all remaining P2/P3 findings from the CRM gap-hunter audit — error/loading boundaries, stage history `changed_by`, dashboard skeletons, scoring route dedup.

**Architecture:** Five independent tasks, each self-contained. Error/loading boundaries follow the existing `accounts/` pattern. Scoring consolidation deletes the duplicate `rescore/` route and redirects its test to `score/POST`. The dead `lead_stage` DB enum is NOT dropped in this plan — it's still referenced by the `leads.stage` column and needs a migration to remove that column first, which is out of scope.

**Tech Stack:** Next.js 16 App Router, Vitest, shadcn/ui Skeleton, Sentry

---

### Task 1: Add error.tsx + loading.tsx to 5 CRM routes

**Files:**
- Create: `app/(dashboard)/org/[orgSlug]/crm/dashboard/error.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/crm/dashboard/loading.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/crm/leads/error.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/crm/leads/loading.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/crm/opportunities/error.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/crm/opportunities/loading.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/crm/settings/error.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/crm/settings/loading.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/crm/tasks/error.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/crm/tasks/loading.tsx`

- [ ] **Step 1: Create all 5 error.tsx files**

Follow the exact pattern from `accounts/error.tsx`. Each file:

```tsx
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorCard } from '@/components/ui/error-card';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorCard
      title="Dashboard Error"
      description="Failed to load the CRM dashboard."
      reset={reset}
      errorMessage={error.message}
      errorDigest={error.digest}
    />
  );
}
```

Substitute title/description per route:
- `dashboard/`: "Dashboard Error" / "Failed to load the CRM dashboard."
- `leads/`: "Leads Error" / "Failed to load leads."
- `opportunities/`: "Opportunities Error" / "Failed to load opportunities."
- `settings/`: "Settings Error" / "Failed to load CRM settings."
- `tasks/`: "Tasks Error" / "Failed to load tasks."

- [ ] **Step 2: Create all 5 loading.tsx files**

Each file:

```tsx
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export default function DashboardLoading() {
  return <PageSkeleton layout="cards" />;
}
```

Use `layout="table"` for leads, opportunities, tasks. Use `layout="cards"` for dashboard, settings.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/org/\[orgSlug\]/crm/dashboard/error.tsx app/\(dashboard\)/org/\[orgSlug\]/crm/dashboard/loading.tsx app/\(dashboard\)/org/\[orgSlug\]/crm/leads/error.tsx app/\(dashboard\)/org/\[orgSlug\]/crm/leads/loading.tsx app/\(dashboard\)/org/\[orgSlug\]/crm/opportunities/error.tsx app/\(dashboard\)/org/\[orgSlug\]/crm/opportunities/loading.tsx app/\(dashboard\)/org/\[orgSlug\]/crm/settings/error.tsx app/\(dashboard\)/org/\[orgSlug\]/crm/settings/loading.tsx app/\(dashboard\)/org/\[orgSlug\]/crm/tasks/error.tsx app/\(dashboard\)/org/\[orgSlug\]/crm/tasks/loading.tsx
git commit -m "feat(crm): add error/loading boundaries to 5 CRM routes"
```

---

### Task 2: Pass `changed_by` to stage history inserts

**Files:**
- Modify: `app/api/crm/leads/[id]/stage/route.ts:51-56`
- Modify: `lib/crm/auto-contacted.ts:35-39`
- Modify: `app/api/crm/leads/bulk/route.ts` (the stage history insert section)

- [ ] **Step 1: Fix stage/route.ts**

In `app/api/crm/leads/[id]/stage/route.ts`, the handler receives `userId` from `withApiRoute` context. Update the insert at line 51:

```typescript
    try {
      await supabase.from('lead_stage_history').insert({
        lead_id: id,
        from_stage: currentStage,
        to_stage: newStage,
        changed_by: userId,
        notes: parsed.lost_reason ?? null,
      });
    } catch {
      logger.error('Failed to record lead stage history', { leadId: id });
    }
```

The `userId` is already destructured from `withApiRoute` context (available as the `userId` parameter in the handler function signature — see `async ({ params, body }) =>` needs to become `async ({ params, body, userId }) =>`).

- [ ] **Step 2: Fix auto-contacted.ts**

In `lib/crm/auto-contacted.ts`, add an optional `changedBy` parameter:

```typescript
export async function maybePromoteToContacted(
  leadId: string,
  supabase: SupabaseClient,
  changedBy?: string,
): Promise<void> {
```

Update the history insert:

```typescript
    await supabase.from('lead_stage_history').insert({
      lead_id: leadId,
      from_stage: 'qualified',
      to_stage: 'contacted',
      changed_by: changedBy ?? null,
      notes: 'Auto-promoted: first outreach sent',
    });
```

- [ ] **Step 3: Fix bulk/route.ts**

In the bulk stage handler's history insert, pass `userId`. The `withApiRoute` handler receives `userId` — thread it through to `handleBulkStage`.

- [ ] **Step 4: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- --testPathPattern="stage" --reporter=dot`
Expected: 0 TS errors, all stage tests pass

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/leads/\[id\]/stage/route.ts lib/crm/auto-contacted.ts app/api/crm/leads/bulk/route.ts
git commit -m "fix(crm): pass changed_by to lead_stage_history inserts"
```

---

### Task 3: Replace dashboard "..." with skeleton loading

**Files:**
- Modify: `app/(dashboard)/org/[orgSlug]/crm/dashboard/_page-content.tsx:81-92`

- [ ] **Step 1: Replace the KPIRow loading pattern**

In `_page-content.tsx`, replace the `KPIRow` function (lines 81-93):

```tsx
function KPIRow({ data, isLoading }: KPIRowProps) {
  const p = data ? data.pipeline : null;
  const v = data ? data.velocity : null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard label="Total Pipeline" value={isLoading ? undefined : fmt(p ? p.totalPipelineValue : 0)} />
      <KPICard label="Weighted Pipeline" value={isLoading ? undefined : fmt(p ? p.weightedPipelineValue : 0)} />
      <KPICard label="Avg Deal Size" value={isLoading ? undefined : fmt(p ? p.averageDealSize : 0)} />
      <KPICard label="Deals Won" value={isLoading ? undefined : (v ? v.dealsClosed : 0)} />
    </div>
  );
}
```

- [ ] **Step 2: Update KPICard to render skeleton when value is undefined**

Read `_page-content.tsx` to find the `KPICard` component. Add a skeleton when `value` is undefined:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

function KPICard({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        {value === undefined ? (
          <Skeleton className="h-8 w-24 mt-1" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/org/\[orgSlug\]/crm/dashboard/_page-content.tsx
git commit -m "fix(crm): replace dashboard '...' loading with skeleton components"
```

---

### Task 4: Consolidate score + rescore routes

**Files:**
- Modify: `app/api/crm/leads/[id]/score/route.ts:58-114`
- Delete: `app/api/crm/leads/[id]/rescore/route.ts`
- Delete: `__tests__/api/crm/leads/rescore.test.ts`

- [ ] **Step 1: Add `triggered_by` parameter to score/POST**

In `app/api/crm/leads/[id]/score/route.ts`, update the POST handler to accept an optional query param:

```typescript
export const POST = withApiRoute({}, async ({ params, req }) => {
  const { id } = params;
  const isRescore = req.nextUrl.searchParams.get('rescore') === 'true';
  const triggeredBy = isRescore ? 'manual_rescore' : 'manual';
```

Add `logger` import. Update line 94 to use logger:

```typescript
  if (updateError) {
    logger.error('Score update failed', { leadId: id, error: updateError.message });
    throw dbError(updateError.message);
  }
```

Update the history insert to use `triggeredBy`:

```typescript
  await supabase.from('lead_score_history').insert({
    lead_id: id,
    lead_score: result.total_score,
    fit_score: result.fit_score,
    intent_score: result.intent_score,
    engagement_score: result.engagement_score,
    triggered_by: triggeredBy,
  });
```

- [ ] **Step 2: Delete rescore route and its test**

```bash
rm app/api/crm/leads/\[id\]/rescore/route.ts
rmdir app/api/crm/leads/\[id\]/rescore
rm __tests__/api/crm/leads/rescore.test.ts
```

- [ ] **Step 3: Verify no other code imports from rescore**

Run: `grep -r "rescore/route" --include="*.ts" --include="*.tsx" .`
Expected: 0 results (only the deleted files referenced it)

- [ ] **Step 4: Run typecheck + tests**

Run: `npm run typecheck && npm run test -- --reporter=dot`
Expected: 0 TS errors, all tests pass (rescore tests gone, score tests still pass)

- [ ] **Step 5: Commit**

```bash
git add -A app/api/crm/leads/\[id\]/score/route.ts
git rm app/api/crm/leads/\[id\]/rescore/route.ts __tests__/api/crm/leads/rescore.test.ts
git commit -m "refactor(crm): consolidate score + rescore into single endpoint"
```

---

### Task 5: Final quality gate

- [ ] **Step 1: Full quality gate**

```bash
npm run typecheck
npm run lint --quiet
npm run test -- --reporter=dot
npm run build
```

Expected: 0 TS errors, 0 lint errors, all tests pass, build succeeds.

- [ ] **Step 2: Final commit with all remaining unstaged changes**

Stage and commit any remaining files.
