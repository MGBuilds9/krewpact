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
