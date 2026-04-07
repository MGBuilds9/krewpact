# Multi-Tenancy Polish & Tech Debt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete multi-tenancy gaps (portal org-scoping, BoldSign per-tenant sender, branding UI), drop dead schema, and document the design system.

**Architecture:** Five independent tasks — no ordering dependencies between them. Portal audit adds org_id API-level filtering to complement existing RLS RESTRICTIVE policies. Branding UI extends the existing form with 4 missing fields + a live preview card. BoldSign stores a per-tenant `brandId` in org_settings. The `lead_stage` enum column is dead (all code uses `leads.status` TEXT) — drop it. DESIGN.md documents the actual running design system.

**Tech Stack:** Next.js 16, Supabase (RLS, migrations), Clerk, Tailwind CSS, shadcn/ui, Vitest, Zod

---

## File Structure

| Task                  | Files                                                               | Action     |
| --------------------- | ------------------------------------------------------------------- | ---------- |
| 1. Branding UI        | `app/(dashboard)/org/[orgSlug]/settings/branding/_page-content.tsx` | Modify     |
| 1. Branding UI        | `__tests__/settings/branding-ui.test.tsx`                           | Create     |
| 2. Portal Org Scoping | `app/api/portal/projects/route.ts`                                  | Modify     |
| 2. Portal Org Scoping | `app/api/portal/trade/tasks/route.ts`                               | Modify     |
| 2. Portal Org Scoping | `app/api/portal/trade/bids/route.ts`                                | Modify     |
| 2. Portal Org Scoping | `app/api/portal/trade/compliance/route.ts`                          | Modify     |
| 2. Portal Org Scoping | `app/api/portal/trade/submittals/route.ts`                          | Modify     |
| 2. Portal Org Scoping | `app/api/portal/trade/site-logs/route.ts`                           | Modify     |
| 2. Portal Org Scoping | `app/api/portal/projects/[id]/route.ts` + 7 sub-routes              | Modify     |
| 2. Portal Org Scoping | `__tests__/api/portal/org-scoping.test.ts`                          | Create     |
| 3. BoldSign Tenant    | `lib/esign/boldsign-client.ts`                                      | Modify     |
| 3. BoldSign Tenant    | `lib/validators/branding.ts`                                        | Modify     |
| 3. BoldSign Tenant    | `__tests__/lib/esign/boldsign-tenant.test.ts`                       | Create     |
| 4. Drop lead_stage    | `supabase/migrations/20260401_002_drop_lead_stage_enum.sql`         | Create     |
| 4. Drop lead_stage    | `types/supabase.ts`                                                 | Regenerate |
| 5. DESIGN.md          | `DESIGN.md`                                                         | Create     |

---

## Task 1: Branding Settings UI — Add Missing Fields + Live Preview

The branding schema and API already support `company_description`, `erp_company`, `footer_text`, and `support_url`. The UI form is missing these 4 fields. Add them plus a live preview card that shows how the branding looks.

**Files:**

- Modify: `app/(dashboard)/org/[orgSlug]/settings/branding/_page-content.tsx`
- Create: `__tests__/settings/branding-ui.test.tsx`

- [ ] **Step 1: Write the failing test for new form fields**

Create `__tests__/settings/branding-ui.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useParams: () => ({ orgSlug: 'test-org' }),
}));
vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    branding: {
      company_name: 'Test Co',
      company_description: 'A test company',
      erp_company: 'Test Co ERP',
      footer_text: '© Test Co 2026',
      support_url: 'https://support.test.co',
      primary_color: '#2563eb',
      accent_color: '#f59e0b',
    },
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import BrandingPageContent from '@/app/(dashboard)/org/[orgSlug]/settings/branding/_page-content';

describe('BrandingPageContent', () => {
  it('renders company_description field', async () => {
    render(<BrandingPageContent />);
    expect(await screen.findByLabelText('Company Description')).toBeInTheDocument();
  });

  it('renders erp_company field', async () => {
    render(<BrandingPageContent />);
    expect(await screen.findByLabelText('ERP Company Name')).toBeInTheDocument();
  });

  it('renders footer_text field', async () => {
    render(<BrandingPageContent />);
    expect(await screen.findByLabelText('Footer Text')).toBeInTheDocument();
  });

  it('renders support_url field', async () => {
    render(<BrandingPageContent />);
    expect(await screen.findByLabelText('Support URL')).toBeInTheDocument();
  });

  it('renders live preview card', async () => {
    render(<BrandingPageContent />);
    expect(await screen.findByText('Live Preview')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/settings/branding-ui.test.tsx`
Expected: FAIL — fields don't exist yet.

- [ ] **Step 3: Add the 4 missing fields + live preview card to the branding form**

In `app/(dashboard)/org/[orgSlug]/settings/branding/_page-content.tsx`, add after the `company_name` field (line 98):

```tsx
<div className="space-y-1">
  <Label htmlFor="company_description">Company Description</Label>
  <Input
    id="company_description"
    {...register('company_description')}
    placeholder="Brief company description for AI prompts and templates"
  />
  <p className="text-xs text-muted-foreground">Used in AI-generated content and email templates.</p>
</div>
```

Add after the `support_email` field (line 103):

```tsx
<div className="space-y-1">
  <Label htmlFor="support_url">Support URL</Label>
  <Input
    id="support_url"
    type="url"
    {...register('support_url')}
    placeholder="https://support.example.com"
  />
</div>
```

Add after the `favicon_url` field (line 117):

```tsx
<div className="space-y-1">
  <Label htmlFor="erp_company">ERP Company Name</Label>
  <Input
    id="erp_company"
    {...register('erp_company')}
    placeholder="Company name in ERPNext (defaults to company name)"
  />
  <p className="text-xs text-muted-foreground">Must match the ERPNext Company doctype name exactly.</p>
</div>

<div className="space-y-1">
  <Label htmlFor="footer_text">Footer Text</Label>
  <Input
    id="footer_text"
    {...register('footer_text')}
    placeholder="© Acme Corp 2026"
  />
</div>
```

Add a second `<Card>` after the form card (before the closing `</div>` of the outer container) for the live preview:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Live Preview</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        borderColor: watch('primary_color') || '#2563eb',
      }}
    >
      <div className="flex items-center gap-3">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt="Logo"
            width={40}
            height={40}
            className="rounded object-contain"
            unoptimized
          />
        )}
        <div>
          <p className="font-semibold" style={{ color: watch('primary_color') || '#2563eb' }}>
            {watch('company_name') || 'Company Name'}
          </p>
          <p className="text-xs text-muted-foreground">
            {watch('company_description') || 'Company description'}
          </p>
        </div>
      </div>
      <div
        className="h-1 rounded-full"
        style={{
          background: `linear-gradient(to right, ${watch('primary_color') || '#2563eb'}, ${watch('accent_color') || '#f59e0b'})`,
        }}
      />
      <p className="text-xs text-muted-foreground text-center">
        {watch('footer_text') || '© Company Name'}
      </p>
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/settings/branding-ui.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/org/\[orgSlug\]/settings/branding/_page-content.tsx __tests__/settings/branding-ui.test.tsx
git commit -m "feat(branding): add company_description, erp_company, footer_text, support_url fields + live preview"
```

---

## Task 2: Portal Multi-Tenancy Audit — API-Level Org Scoping

RLS RESTRICTIVE policies already exist on `portal_accounts`, `portal_permissions`, `portal_messages`, and `portal_view_logs` (from `20260302_002_rls_org_scope.sql`). However, portal API routes use `createUserClientSafe()` (user-scoped) without explicit org_id assertions. Since portal users authenticate via Clerk and the RLS policies check `krewpact_org_id()` from JWT claims, the RLS layer **is** enforcing org isolation for SELECT queries.

**Audit findings:**

- All 17 portal API routes use `createUserClientSafe()` — RLS is active.
- Portal accounts are scoped via `clerk_user_id` match + org_id RESTRICTIVE policy.
- The `portal_permissions` join to `portal_accounts` inherits org scoping through the RESTRICTIVE policy.
- **Gap:** Routes using `createServiceClient()` (bypasses RLS) — **none found** in portal routes. All clean.
- **Gap:** INSERT/UPDATE/DELETE policies on portal tables only check role, not org. Internal staff from Org A could INSERT a portal_account for Org B. This is RLS-level — needs a migration.
- **Gap:** The API routes don't explicitly pass `org_id` on inserts — they rely on the table's `DEFAULT` or the trigger. Need to verify each write path.

**Assessment:** The portal is already org-scoped for reads via RLS RESTRICTIVE policies. The risk is write-path org-crossing (an internal user creating portal accounts in a different org). This needs RESTRICTIVE write policies in a migration, plus explicit `org_id` on insert calls.

**Files:**

- Create: `supabase/migrations/20260401_003_portal_rls_write_org_scope.sql`
- Modify: `app/api/portal/projects/[id]/messages/route.ts` (if it has POST — add org_id)
- Create: `__tests__/api/portal/org-scoping.test.ts`

- [ ] **Step 1: Write the migration for portal write-path org scoping**

Create `supabase/migrations/20260401_003_portal_rls_write_org_scope.sql`:

```sql
-- Portal write-path org scoping
-- The existing RESTRICTIVE SELECT policies (from 20260302_002) protect reads.
-- This migration adds RESTRICTIVE INSERT/UPDATE policies to prevent cross-org writes.

BEGIN;

-- portal_accounts: internal staff can only INSERT for their own org
CREATE POLICY portal_accounts_org_restrict_insert ON portal_accounts
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY portal_accounts_org_restrict_update ON portal_accounts
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- portal_permissions: internal staff can only write permissions for their own org's accounts
CREATE POLICY portal_permissions_org_restrict_insert ON portal_permissions
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY portal_permissions_org_restrict_update ON portal_permissions
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- portal_messages: org-scope writes
CREATE POLICY portal_messages_org_restrict_insert ON portal_messages
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

CREATE POLICY portal_messages_org_restrict_update ON portal_messages
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

-- portal_view_logs: org-scope inserts
CREATE POLICY portal_view_logs_org_restrict_insert ON portal_view_logs
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (org_id::text = public.krewpact_org_id() OR public.is_platform_admin());

COMMIT;
```

- [ ] **Step 2: Write the test for portal org scoping**

Create `__tests__/api/portal/org-scoping.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Verify that portal API routes use user-scoped clients (not service client)
describe('Portal API org scoping', () => {
  const portalRouteFiles = [
    'app/api/portal/projects/route.ts',
    'app/api/portal/trade/tasks/route.ts',
    'app/api/portal/trade/bids/route.ts',
    'app/api/portal/trade/compliance/route.ts',
    'app/api/portal/trade/submittals/route.ts',
    'app/api/portal/trade/site-logs/route.ts',
  ];

  it.each(portalRouteFiles)('%s uses createUserClientSafe (not service client)', async (file) => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(path.resolve(file), 'utf-8');
    expect(content).toContain('createUserClientSafe');
    expect(content).not.toContain('createServiceClient');
  });

  it('portal_accounts RLS migration includes write-path RESTRICTIVE policies', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migration = fs.readFileSync(
      path.resolve('supabase/migrations/20260401_003_portal_rls_write_org_scope.sql'),
      'utf-8',
    );
    expect(migration).toContain('portal_accounts_org_restrict_insert');
    expect(migration).toContain('portal_permissions_org_restrict_insert');
    expect(migration).toContain('portal_messages_org_restrict_insert');
    expect(migration).toContain('RESTRICTIVE');
    expect(migration).toContain('krewpact_org_id()');
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run __tests__/api/portal/org-scoping.test.ts`
Expected: PASS — the routes already use `createUserClientSafe` and the migration file was just created.

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260401_003_portal_rls_write_org_scope.sql __tests__/api/portal/org-scoping.test.ts
git commit -m "fix(security): add RESTRICTIVE write-path RLS policies for portal tables"
```

---

## Task 3: BoldSign Per-Tenant Sender (Feature-Flagged)

BoldSign supports a `BrandId` parameter on envelope creation to control sender identity and email branding. Currently the `BoldSignClient` accepts an optional `brandId` in `CreateEnvelopeParams` (line 96 of boldsign-client.ts). The per-tenant approach: store a `boldsign_brand_id` in the branding config, and have callers pass it when creating envelopes.

**Files:**

- Modify: `lib/validators/branding.ts` — add `boldsign_brand_id` optional field
- Modify: `lib/tenant/branding.ts` — expose `boldsign_brand_id` in `OrgBrandingInfo`
- Create: `__tests__/lib/esign/boldsign-tenant.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/esign/boldsign-tenant.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { brandingSchema } from '@/lib/validators/branding';

describe('BoldSign per-tenant branding', () => {
  it('brandingSchema accepts boldsign_brand_id', () => {
    const result = brandingSchema.safeParse({
      company_name: 'Test Co',
      boldsign_brand_id: 'brand_abc123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.boldsign_brand_id).toBe('brand_abc123');
    }
  });

  it('brandingSchema allows empty boldsign_brand_id', () => {
    const result = brandingSchema.safeParse({
      company_name: 'Test Co',
      boldsign_brand_id: '',
    });
    expect(result.success).toBe(true);
  });

  it('brandingSchema omits boldsign_brand_id when not provided', () => {
    const result = brandingSchema.safeParse({ company_name: 'Test Co' });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/lib/esign/boldsign-tenant.test.ts`
Expected: FAIL — `boldsign_brand_id` not in schema yet.

- [ ] **Step 3: Add `boldsign_brand_id` to the branding schema**

In `lib/validators/branding.ts`, add inside the `z.object({})` after line 21 (`erp_company`):

```typescript
  boldsign_brand_id: z.union([emptyToUndefined, z.string().max(100)]).optional(),
```

- [ ] **Step 4: Add `boldsign_brand_id` to `OrgBrandingInfo`**

In `lib/tenant/branding.ts`, add to the `OrgBrandingInfo` interface (after `support_url`):

```typescript
boldsign_brand_id: string | null;
```

And in the `result` object inside `getOrgBranding()` (after `support_url`):

```typescript
    boldsign_brand_id: branding.boldsign_brand_id ?? null,
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run __tests__/lib/esign/boldsign-tenant.test.ts`
Expected: PASS

- [ ] **Step 6: Run existing branding tests to check for regressions**

Run: `npx vitest run __tests__/lib/validators/branding.test.ts __tests__/tenant/branding.test.ts __tests__/lib/tenant/branding-css.test.ts`
Expected: All pass. The new optional field shouldn't break existing tests.

- [ ] **Step 7: Commit**

```bash
git add lib/validators/branding.ts lib/tenant/branding.ts __tests__/lib/esign/boldsign-tenant.test.ts
git commit -m "feat(esign): add boldsign_brand_id to branding config for per-tenant e-sign sender"
```

---

## Task 4: Drop Dead `lead_stage` Enum

The `leads.stage` column uses the `lead_stage` DB enum, but all application code operates on `leads.status` (TEXT column). The `lead_stage_history` table uses TEXT columns for `from_stage`/`to_stage`, so it's unaffected. The `update_lead_stage_entered_at()` trigger fires on `leads.status` changes, not `leads.stage`. The enum column is dead weight.

**Evidence:** Zero TS code reads `leads.stage`. The stage route (`app/api/crm/leads/[id]/stage/route.ts`) reads and writes `leads.status`. The LEAD_SELECT constant on line 11 of that file does not include `stage`. The `LeadStage` TS type in `lib/crm/lead-stages.ts` is independently defined (not derived from the DB enum).

**Files:**

- Create: `supabase/migrations/20260401_002_drop_lead_stage_enum.sql`
- Regenerate: `types/supabase.ts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260401_002_drop_lead_stage_enum.sql`:

```sql
-- Drop dead lead_stage enum column from leads table
-- The leads.status TEXT column is the active stage field used by all application code.
-- The lead_stage_history table uses TEXT columns (unaffected).
-- The update_lead_stage_entered_at() trigger fires on leads.status changes (unaffected).

BEGIN;

-- 1. Drop the dead column (this automatically drops any DEFAULT on it)
ALTER TABLE leads DROP COLUMN IF EXISTS stage;

-- 2. Drop the enum type (no other columns reference it)
DROP TYPE IF EXISTS lead_stage;

COMMIT;
```

- [ ] **Step 2: Verify no TS code references `leads.stage`**

Run: `grep -r '\.stage' app/api/crm/leads/ --include='*.ts' | grep -v 'stage_history\|stage_entered_at\|LeadStage\|from_stage\|to_stage\|lead stage\|log.*stage'`
Expected: No results — confirming all code uses `status`, not `stage`.

- [ ] **Step 3: Regenerate Supabase types**

Run: `supabase gen types typescript --local > types/supabase.ts 2>/dev/null`

Then verify the `lead_stage` enum is gone from the generated types:

Run: `grep 'lead_stage' types/supabase.ts`
Expected: No matches (the enum definition and column type should both be gone).

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass. If any test references `leads.stage` directly, fix it.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260401_002_drop_lead_stage_enum.sql types/supabase.ts
git commit -m "chore(schema): drop dead lead_stage enum column — all code uses leads.status"
```

---

## Task 5: DESIGN.md — Document the Actual Design System

The existing `design-system/krewpact/MASTER.md` describes a "Luxury/Premium Brand" theme that doesn't match the actual implementation. Create a root-level `DESIGN.md` that documents what's actually running.

**Files:**

- Create: `DESIGN.md`

- [ ] **Step 1: Create `DESIGN.md`**

Create `DESIGN.md` at the project root:

```markdown
# KrewPact Design System

Construction operations platform UI. Built on shadcn/ui + Tailwind CSS.

## Brand Identity

- **Industry:** Construction operations (B2B SaaS)
- **Tone:** Professional, functional, trustworthy. Not flashy.
- **Test:** "Would a non-technical construction manager understand this screen?"

## Color System

All colors use HSL CSS variables (defined in `app/globals.css`), consumed via Tailwind tokens.

### Light Mode

| Token                 | HSL           | Hex (approx) | Usage                                               |
| --------------------- | ------------- | ------------ | --------------------------------------------------- |
| `--primary`           | `25 95% 38%`  | `#bd5a0a`    | Construction orange — buttons, links, active states |
| `--accent`            | `25 95% 38%`  | `#bd5a0a`    | Same as primary (unified brand)                     |
| `--background`        | `0 0% 100%`   | `#ffffff`    | Page background                                     |
| `--foreground`        | `221 39% 11%` | `#111827`    | Body text                                           |
| `--muted`             | `220 14% 96%` | `#f4f5f7`    | Disabled, secondary surfaces                        |
| `--muted-foreground`  | `215 16% 42%` | `#596577`    | Secondary text                                      |
| `--destructive`       | `0 84% 60%`   | `#ef4444`    | Errors, delete actions                              |
| `--success`           | `142 71% 45%` | `#22c55e`    | Positive indicators                                 |
| `--warning`           | `48 96% 89%`  | `#fef3c7`    | Caution banners                                     |
| `--info`              | `213 94% 68%` | `#60a5fa`    | Informational badges                                |
| `--construction-dark` | `221 39% 11%` | `#111827`    | Dark headers, hero sections                         |
| `--border`            | `220 13% 91%` | `#e5e7eb`    | Borders, dividers                                   |

### Dark Mode

| Token          | HSL           | Notes                         |
| -------------- | ------------- | ----------------------------- |
| `--background` | `215 25% 15%` | Slate base                    |
| `--primary`    | `215 20% 65%` | Desaturated blue (NOT orange) |
| `--accent`     | `25 95% 38%`  | Orange stays as accent        |

### Semantic Colors

Use tokens, never raw hex: `text-primary`, `bg-destructive`, `text-muted-foreground`, etc.

### Gradients

- `--gradient-primary`: `135deg` orange gradient (CTAs, highlights)
- `--gradient-construction`: `135deg` dark navy gradient (hero sections, portal headers)
- `--gradient-subtle`: `180deg` white→gray (page backgrounds)

### Shadows

- `--shadow-card`: Subtle card shadow (2px blur)
- `--shadow-elegant`: Medium depth (20px blur, low opacity)
- `--shadow-construction`: Warm orange glow (30px blur) — hover states

## Typography

| Token          | Font   | Usage                             |
| -------------- | ------ | --------------------------------- |
| `font-sans`    | Inter  | Body text, UI labels, form inputs |
| `font-heading` | Outfit | Page titles, section headers      |

**Note:** `Atkinson Hyperlegible` is loaded in `app/layout.tsx` as `--font-atkinson` but not wired into Tailwind tokens. Inter is the active body font via Tailwind config.

**Scale:** Use Tailwind defaults (`text-xs` through `text-4xl`). No custom type scale.

## Spacing & Radius

- **Border radius:** `--radius: 1rem` (large, rounded aesthetic)
  - `rounded-lg` = `var(--radius)` = 1rem
  - `rounded-md` = 0.875rem
  - `rounded-sm` = 0.75rem
- **Container:** max-width `1400px`, `2rem` padding, centered
- **Spacing:** Tailwind defaults. Prefer `space-y-*` and `gap-*` over manual margin.

## Component Patterns

### Primitives (`components/ui/`)

shadcn/ui output — **never modify directly**. Update via `npx shadcn@latest add <component>`.

### Shared Components (`components/shared/`)

| Component           | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `PageHeader`        | Title + description + optional action slot                       |
| `StatusBadge`       | Auto-maps status string → Badge variant via `STATUS_VARIANT_MAP` |
| `StatsCard`         | Metric display (icon + value + label)                            |
| `DataTable`         | Sortable, filterable table with pagination                       |
| `DataTableSkeleton` | Loading state for DataTable                                      |
| `PageSkeleton`      | Full-page loading skeleton                                       |
| `EmptyState`        | Zero-data state with icon + message + optional action            |
| `ConfirmDialog`     | Destructive action confirmation (AlertDialog wrapper)            |
| `FormSection`       | Fieldset with title/description for form grouping                |

**Patterns all shared components follow:**

- Named exports (not default)
- Accept `className` prop, merged via `cn()`
- Typed props interface exported alongside component
- Semantic tokens only — no hardcoded colors
- Composition over prop drilling (wrap shadcn primitives)
- `action?: React.ReactNode` slot for interactive children

### Domain Components (`components/[Domain]/`)

Grouped by domain: `CRM/`, `Projects/`, `Layout/`, `Dashboard/`, `Inventory/`, etc.
One exported component per file. No barrel files.

## Layout Patterns

### Dashboard Layout
```

Sidebar (collapsible) | Main content area
| PageHeader
| Content (Cards, Tables, Forms)

```

### Settings Pattern

Tabs → Card → Form (with FormSection groupings)

### Portal Pattern

Gradient hero header → Card grid → Content sections

## Interaction Patterns

- **Loading:** Skeleton components everywhere. Never "Loading..." text.
- **Errors:** `error.tsx` per route group + `global-error.tsx`. Structured error responses.
- **Confirmations:** shadcn `AlertDialog` for destructive actions. Never `window.confirm()`.
- **Toasts:** `sonner` via `toast.success()` / `toast.error()`. No `window.alert()`.
- **Transitions:** `--transition-smooth` (0.3s ease) for most, `--transition-bounce` for emphasis.

## Animations

- `fade-in`: 0.5s opacity + translateY(10px → 0)
- `slide-up`: 0.3s opacity + translateY(20px → 0)
- `accordion-down/up`: 0.2s height transitions (Radix accordion)
- `animate-pulse`: Status indicators (online dots)

## Accessibility

- WCAG AA target (AODA compliance for Ontario)
- Radix primitives for ARIA patterns
- `.touch-target` utility: min 44×44px hit area
- `aria-hidden="true"` on decorative icons
- `@axe-core/playwright` in CI

## CSS Architecture

```

app/globals.css → CSS variables + @layer base/components
tailwind.config.ts → Token mapping (hsl(var(--_))) + custom extensions
components/ui/_.tsx → shadcn primitives (CLI-managed)
components/shared/\*.tsx → Composed components (cn() + semantic tokens)

```

No CSS modules. No styled-components. Tailwind utility classes + CSS variables only.

## Anti-Patterns

- Never hardcode hex colors — use tokens
- Never modify `components/ui/` — use shadcn CLI
- Never use `window.prompt()` or `window.confirm()` — use Dialog/AlertDialog
- Never show raw UUIDs — display human-readable names
- Never leave loading state as "Loading..." — use skeletons
- Never show zeros-while-loading — use skeleton or null state
```

- [ ] **Step 2: Verify the documented values match reality**

Run these checks:

```bash
# Primary color in globals.css
grep -- '--primary:' app/globals.css | head -2
# Expected: 25 95% 38% (light) and 215 20% 65% (dark)

# Font in tailwind.config.ts
grep -A1 "fontFamily" tailwind.config.ts
# Expected: sans: ['Inter'], heading: ['Outfit']

# Radius
grep -- '--radius:' app/globals.css
# Expected: 1rem
```

- [ ] **Step 3: Commit**

```bash
git add DESIGN.md
git commit -m "docs: add DESIGN.md documenting the actual running design system"
```

---

## Self-Review Checklist

| Requirement                                        | Task   | Status                                                                           |
| -------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| Portal multi-tenancy audit                         | Task 2 | Covered — RLS reads already scoped, write-path migration added                   |
| BoldSign per-tenant sender                         | Task 3 | Covered — `boldsign_brand_id` in branding config                                 |
| Branding settings UI (3 new fields + live preview) | Task 1 | Covered — 4 fields + preview card                                                |
| DESIGN.md                                          | Task 5 | Covered — documents actual system, not aspirational                              |
| Drop dead lead_stage enum                          | Task 4 | Covered — migration drops column + type                                          |
| Type consistency                                   | All    | `BrandingConfig` type auto-inferred from Zod; `OrgBrandingInfo` manually updated |
| No placeholders                                    | All    | All code blocks complete                                                         |
