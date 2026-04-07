# TODOS

Deferred work captured during eng review (2026-03-30).

## Multi-Tenancy Follow-ups

### Portal Multi-Tenancy

**What:** Portal routes `(portal)/*` need the same org-scoping treatment as dashboard routes.
**Why:** External clients and trade partners access the portal. If a second tenant's clients hit the portal, they'll see MDM-scoped data or broken routes.
**Pros:** Completes multi-tenancy across all user-facing surfaces.
**Cons:** Portal is a separate product surface with its own auth/access patterns. May need dedicated exploration.
**Context:** The `proxy.ts` middleware handles portal paths but was not audited for org assumptions. Check portal API routes, portal-specific components, and any portal-specific data fetching for MDM hardcoding.
**Depends on:** Phase 1 multi-tenancy core (withApiRoute orgId, branding utility).

### ~~Service Client Org-Scoping Audit~~ ✅ Done (Phase 1.5, Mar 31)

**Fixed:** `knowledge_staging` routes (staging list/detail/bulk-import) now filter by `org_id`. `executive_subscriptions` already used `createUserClientSafe()` (RLS-scoped). Chat route uses `orgId` from `withApiRoute` context.

### ~~Knowledge Layer Org-Scoping Migration~~ ✅ Done (Mar 31)

**Fixed:** Added `org_id` to `knowledge_docs` + `ai_chat_sessions`. Updated `match_knowledge` RPC with `p_org_id` param. Updated RLS on all 4 knowledge tables (knowledge_docs, knowledge_embeddings, ai_chat_sessions, ai_chat_messages). Updated 5 API routes. Migration: `20260401_001_knowledge_org_id.sql`.

### Broader Service Client Audit — Remaining Items

**What:** Additional `createServiceClient()` routes found during Phase 1.5 audit that may need org scoping.
**Why:** Service client bypasses RLS. Routes without explicit org_id filters could leak data cross-org.
**Items:**

- `crm/leads/[id]/research/route.ts` — fetches leads by ID only (low risk: ID-scoped + role-gated)
- `crm/opportunities/[id]/won/route.ts` — reads accounts/leads without org filter (low risk: ID-scoped)
- `web/leads/route.ts` — public inbound lead insert has no org_id (needs org resolution for public form)
- `payroll/exports/route.ts` — lists payroll_exports globally (needs org filter if table has org_id)
  **Depends on:** Phase 1 multi-tenancy core.

### BoldSign Sender Email

**What:** `contracts@krewpact.com` is hardcoded as the e-sign sender. Make configurable per-tenant.
**Why:** Second tenant's contracts will send from KrewPact's email, not their own brand. Confusing for their clients.
**Pros:** Professional per-tenant contract experience.
**Cons:** Requires per-tenant email setup (DNS, SPF/DKIM) or shared KrewPact sender with dynamic branding.
**Context:** Check if `contracts@krewpact.com` actually exists (it may not be set up yet). Add `boldsign_sender_email` to org_settings or branding config. Contracts are behind feature flag — second tenant may not need them in wedge mode.
**Depends on:** Nothing (can be done independently).

## Design

### Create DESIGN.md (Design System)

**What:** Run `/design-consultation` to create a formal DESIGN.md capturing fonts, spacing scale, color tokens, component patterns, and dark mode conventions.
**Why:** No formal design system exists. Every new screen is a judgment call against implicit patterns. As more developers contribute, inconsistency will compound.
**Pros:** Single source of truth for design decisions. Faster implementation (less guessing). Consistent UX across tenants.
**Cons:** Takes a session to create properly. Low urgency while team is 1-2 devs.
**Context:** Codebase uses shadcn/ui (New York style) + Tailwind + zinc/neutral palette consistently, but this is implicit convention, not documented. The branding settings live preview (decided in design review) will need defined color token mapping.
**Depends on:** Nothing (independent).

## Tech Debt

### Drop Dead `lead_stage` DB Enum

**What:** Remove dead `lead_stage` enum values from database. Requires migration to drop `leads.stage` column first.
**Why:** Dead enum values create confusion. The `leads.stage` column is superseded by `lead_stage_history` table (Mar 30 pipeline reorder).
**Pros:** Cleaner schema, no stale enum values.
**Cons:** Requires careful migration — verify no code references `leads.stage` before dropping.
**Context:** Identified during CRM pipeline reorder (Mar 30). Stage history drives progress bar now, not the column.
**Depends on:** Nothing (independent migration).

### `inventory_stock_summary` Materialized View Has No RLS

**What:** The `inventory_stock_summary` matview aggregates from `inventory_ledger` directly with no row-level security. Any user with SELECT grant on the view can read aggregate stock positions (item_id, location_id, qty_on_hand, total_value) for items they have no division access to.
**Why:** Information leak across divisions. The matview returns data the user shouldn't see, and the application layer (`getStockSummary` in `lib/inventory/stock-summary.ts`) had to compensate with a post-fetch RLS-enforcement filter (commit `541a6559`, F1 fix). Application-layer RLS is fragile — any new caller that hits the matview directly bypasses it.
**Pros:** Closes the underlying security gap. Removes need for application-layer RLS-enforcement workarounds.
**Cons:** Requires migration. Need to either (a) wrap the matview in a `SECURITY INVOKER` view that JOINs `inventory_items` so RLS gates via the join, (b) replace with a `SECURITY INVOKER` RPC function that takes the caller's claims into account, or (c) recreate as a real view (not materialized) with `security_invoker = true`. Trade-offs: option (a) simplest, option (b) most flexible, option (c) loses matview perf benefits.
**Context:** Identified by `/qa` 2026-04-07 (afternoon verification): 10 inventory items rendered as "Unknown" name on `/org/mdm-group/inventory` for the ci-test user (Project Coordinator role, zero division assignments). Root cause traced via Supabase MCP: the matview returned 10 rows from wood + telecom divisions, but the RLS-gated `inventory_items` SELECT returned 0 rows. Items DO exist with valid names; the issue is RLS bypass at the matview layer.
**Depends on:** Nothing (independent migration). Should be coordinated with the matview refresh job so the new SECURITY INVOKER wrapper doesn't break refresh semantics.

### F2 — `/inventory` Page Never Reaches Network Idle (Slow Page)

**What:** Playwright `waitForLoadState('networkidle')` times out after 30s on `/org/mdm-group/inventory`. Other pages (dashboard, CRM dashboard, leads, etc.) reach networkidle in 1-3s. The current QA workaround in `e2e/qa/qa-verification.spec.ts:181` uses `waitForLoadState('domcontentloaded')` + a 1500ms wait.
**Why:** Symptom of slow data fetches, prefetch fan-out, or a hidden continuous-request loop. Affects QA reliability and signals real production slowness.
**Investigation done (2026-04-07, F1 fix session):**

- Ruled out: React Query `refetchInterval` (none in any inventory hook), `setInterval` polling (not present), Supabase Realtime subscriptions (none on inventory routes), `api-client.ts` retry loops (none).
- All inventory hooks use `staleTime: 30_000` or `60_000` — no continuous refetching.
- `apiFetchList` discards the `total` count from paginated responses, so the inventory overview "Total Items" / "Stock Positions" stat cards display the slice length (always = `limit`), not the real count. **Separate UI bug, not the root cause of F2.**
  **Remaining suspects (in order of likelihood):**

1. **Next.js Link prefetch fan-out** — `InventoryLayout` renders 8 tab nav `<Link>` components, all in viewport on first paint. Each Link auto-prefetches the target route's RSC payload, including its initial Server Component data fetches. If `/inventory/items` (probably the slowest) takes 3-5s on a cold function, 8 parallel prefetches × 3-5s could exceed the 30s networkidle window. CRM dashboard has 5 tabs (faster total).
2. **`getStockSummary` matview cold query** — first hit on `inventory_stock_summary` after a refresh might be slow.
3. **Sentry Replay continuous beaconing** — but should affect all pages equally, not just /inventory. Lower likelihood.
   **Diagnosis required:** Open Chrome DevTools Network tab on `/org/mdm-group/inventory` in production, record 30s, identify the request loop pattern.
   **Mitigation strategies (post-diagnosis):**

- A) Add `prefetch={false}` to `InventoryLayout` tab Links (defensive, low risk, may or may not fix F2 depending on actual cause)
- B) Profile and optimize the slowest sub-route prefetched (likely `/inventory/items`)
- C) Refresh the matview on a schedule so cold queries don't pay the aggregation cost
  **Depends on:** Production browser profiling — cannot diagnose definitively from code alone.
