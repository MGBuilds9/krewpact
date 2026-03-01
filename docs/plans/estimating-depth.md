# Estimating Module Depth Plan

## Current State

- Estimate pages exist (`/estimates`, `/estimates/[id]`)
- Validators exist (`lib/validators/estimating.ts`) — 35 passing tests
- DB tables: `estimates`, `estimate_lines`, `estimate_versions`
- Basic CRUD API routes operational
- Only 3 test files (vs 50+ for CRM)

## What's Missing

### 1. Cost Catalog CRUD

**Route:** `/api/estimates/cost-catalog`
**UI:** `/estimates/cost-catalog` page

Manage labor, material, and equipment unit rates. Foundation for assemblies and line item calculations.

**Schema (new table):**
```sql
CREATE TABLE cost_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id),
  item_code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,        -- 'labor', 'material', 'equipment', 'subcontract'
  unit TEXT NOT NULL,             -- 'hr', 'sqft', 'ea', 'lf', 'cy', 'day'
  unit_cost NUMERIC(14,4) NOT NULL,
  markup_pct NUMERIC(6,3) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Assembly Builder

Component for grouping items into reusable assemblies.

**Example:** "Drywall Partition" assembly =
- Drywall (material, 1.1 sheets/sqft)
- Metal studs (material, 0.375/lf)
- Taping compound (material, 0.05/sqft)
- Drywall installer (labor, 0.15 hr/sqft)
- Fasteners (material, $0.50/sqft)

**Schema (new table):**
```sql
CREATE TABLE assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  division_id UUID REFERENCES divisions(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assembly_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID REFERENCES assemblies(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES cost_catalog_items(id),
  quantity_factor NUMERIC(14,4) NOT NULL,
  sort_order INTEGER DEFAULT 0
);
```

### 3. Estimate Builder with Line Items + Calculations

Enhanced estimate editor with:
- Add line items from cost catalog or freeform
- Add assemblies (auto-expand into line items)
- Quantity x unit cost with markup %
- Subtotal, contingency %, tax (GST/HST), grand total
- Real-time recalculation

### 4. Estimate Versioning + Comparison

- Save version snapshot (already have `estimate_versions` table)
- Side-by-side diff view between revisions
- Restore previous version

### 5. PDF Proposal Export

Generate branded PDF from estimate data.

**Options:**
- `@react-pdf/renderer` (React-native PDF generation)
- Puppeteer/Playwright (HTML → PDF, more flexible styling)

**Content:** MDM letterhead, scope description, line items, totals, terms, signature block.

### 6. CRM Integration

- Link estimate to opportunity (already have `opportunity_id` FK)
- "Convert to Proposal" action → generates PDF, attaches to opportunity
- Estimate status changes reflected in opportunity timeline

## Implementation Sequence

| Phase | Feature | Depends On |
|-------|---------|------------|
| 1 | Cost catalog API + page | Nothing |
| 2 | Assembly builder | Cost catalog |
| 3 | Estimate builder (line items + calculations) | Cost catalog, assemblies |
| 4 | Versioning + comparison UI | Estimate builder |
| 5 | PDF export | Estimate builder |
| 6 | CRM integration | PDF export, opportunities |

## Estimated Effort

- Phase 1-2: ~1 week (catalog + assemblies)
- Phase 3: ~1 week (estimate builder)
- Phase 4-6: ~1 week (versioning, PDF, CRM link)

Total: ~3 weeks of development time
