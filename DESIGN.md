# KrewPact Design System

Tailwind CSS + shadcn/ui (New York style) design system for a construction operations platform. Tone: professional, legible, field-ready — not luxury.

> **Construction manager test:** "Would a non-technical construction manager understand this screen?"

---

## Brand Identity

- **Industry:** Construction / Field Operations (Ontario, Canada)
- **Tone:** Direct, professional, high-contrast — never decorative for its own sake
- **Primary color:** Construction orange (HSL 25 95% 38%) — warm amber-orange, not safety orange
- **Dark anchor:** Navy/slate (`construction-dark`, HSL 221 39% 11%) for headers and high-contrast surfaces

---

## Color System

### Light Mode Tokens

| Token                            | HSL         | Approx Hex | Usage                               |
| -------------------------------- | ----------- | ---------- | ----------------------------------- |
| `--background`                   | 0 0% 100%   | #ffffff    | Page background                     |
| `--foreground`                   | 221 39% 11% | #0f1729    | Body text                           |
| `--card`                         | 0 0% 100%   | #ffffff    | Card surfaces                       |
| `--card-foreground`              | 221 39% 11% | #0f1729    | Card text                           |
| `--primary`                      | 25 95% 38%  | #ba5504    | Primary actions, CTA buttons        |
| `--primary-foreground`           | 0 0% 100%   | #ffffff    | Text on primary                     |
| `--secondary`                    | 220 14% 96% | #f1f2f5    | Secondary buttons, muted surfaces   |
| `--secondary-foreground`         | 221 39% 11% | #0f1729    | Text on secondary                   |
| `--muted`                        | 220 14% 96% | #f1f2f5    | Muted backgrounds                   |
| `--muted-foreground`             | 215 16% 42% | #5b6880    | Placeholder, captions               |
| `--accent`                       | 25 95% 38%  | #ba5504    | Accent highlights (same as primary) |
| `--accent-foreground`            | 0 0% 100%   | #ffffff    | Text on accent                      |
| `--destructive`                  | 0 84% 60%   | #f04747    | Error, danger actions               |
| `--destructive-foreground`       | 0 0% 100%   | #ffffff    | Text on destructive                 |
| `--border`                       | 220 13% 91% | #e3e5eb    | Borders, dividers                   |
| `--input`                        | 220 13% 91% | #e3e5eb    | Input borders                       |
| `--ring`                         | 25 95% 38%  | #ba5504    | Focus ring                          |
| `--success`                      | 142 71% 45% | #22c55e    | Success states                      |
| `--success-foreground`           | 0 0% 100%   | #ffffff    | Text on success                     |
| `--warning`                      | 48 96% 89%  | #fef3c7    | Warning backgrounds                 |
| `--warning-foreground`           | 25 38% 14%  | #3d1f08    | Text on warning                     |
| `--info`                         | 213 94% 68% | #60b4f9    | Informational                       |
| `--info-foreground`              | 0 0% 100%   | #ffffff    | Text on info                        |
| `--construction-dark`            | 221 39% 11% | #0f1729    | Dark headers, branded surfaces      |
| `--construction-dark-foreground` | 0 0% 100%   | #ffffff    | Text on dark                        |

### Dark Mode Tokens

| Token          | HSL         | Usage                                    |
| -------------- | ----------- | ---------------------------------------- |
| `--background` | 215 25% 15% | Dark page background                     |
| `--foreground` | 215 20% 88% | Dark body text                           |
| `--card`       | 215 25% 18% | Dark card surfaces                       |
| `--primary`    | 215 20% 65% | Muted blue-grey (primary shifts in dark) |
| `--muted`      | 215 25% 20% | Dark muted backgrounds                   |
| `--accent`     | 25 95% 38%  | Orange accent unchanged in dark          |
| `--border`     | 215 25% 25% | Dark borders                             |
| `--ring`       | 25 95% 38%  | Focus ring unchanged                     |

Note: In dark mode, `--primary` shifts to a muted blue-grey while `--accent` stays construction orange. Use `accent` for brand moments in dark mode.

### Sidebar Tokens

Sidebar has its own token namespace (`--sidebar-*`) mirroring the main palette. In both light and dark, `sidebar-primary` and `sidebar-accent` stay orange (25 95% 38%).

### Semantic Color Rule

- **Interactive / CTA:** `primary` (orange)
- **Status success:** `success`
- **Status warning:** `warning`
- **Status error:** `destructive`
- **Informational:** `info`
- **Dark branded surfaces:** `construction-dark`

### Gradients

| Name                    | Value                                                         | Usage                    |
| ----------------------- | ------------------------------------------------------------- | ------------------------ |
| `gradient-primary`      | `linear-gradient(135deg, hsl(25 95% 38%), hsl(25 90% 45%))`   | Orange CTA gradients     |
| `gradient-construction` | `linear-gradient(135deg, hsl(221 39% 11%), hsl(215 25% 27%))` | Dark branded headers     |
| `gradient-subtle`       | `linear-gradient(180deg, hsl(0 0% 100%), hsl(220 14% 96%))`   | Page/section backgrounds |

### Shadows

| Name                  | Value                                      | Usage                        |
| --------------------- | ------------------------------------------ | ---------------------------- |
| `shadow-construction` | `0 10px 30px -10px hsl(39 100% 60% / 0.3)` | Hover elevation, orange glow |
| `shadow-elegant`      | `0 4px 20px -4px hsl(25 17% 11% / 0.15)`   | Modals, popovers             |
| `shadow-card`         | `0 2px 8px -2px hsl(25 17% 11% / 0.1)`     | Default card shadow          |

### Transitions

| Name                | Value                                             |
| ------------------- | ------------------------------------------------- |
| `transition-smooth` | `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`           |
| `transition-bounce` | `all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)` |

Both are disabled (set to `none`) when `prefers-reduced-motion: reduce`.

---

## Typography

### Font Tokens (tailwind.config.ts)

| Token          | Font   | Usage                      |
| -------------- | ------ | -------------------------- |
| `font-sans`    | Inter  | Body text, UI labels, data |
| `font-heading` | Outfit | Headings, display text     |

### Atkinson Hyperlegible (layout.tsx)

`Atkinson_Hyperlegible` is loaded via `next/font/google` (weights 400, 700) and exposed as `--font-atkinson`. It is loaded at the root layout level but **not mapped to a Tailwind token** — use the CSS variable directly if needed for accessibility-critical text.

### Type Scale (Tailwind defaults, key usages)

| Class                               | Usage                                      |
| ----------------------------------- | ------------------------------------------ |
| `text-2xl font-bold tracking-tight` | Page titles (`PageHeader`)                 |
| `text-sm text-muted-foreground`     | Descriptions, captions, back links         |
| `gradient-text` utility             | Branded gradient text (primary color clip) |

---

## Spacing & Radius

### Border Radius

| Token            | Value             | Tailwind class |
| ---------------- | ----------------- | -------------- |
| `--radius`       | `1rem` (16px)     | `rounded-lg`   |
| `--radius - 2px` | `0.875rem` (14px) | `rounded-md`   |
| `--radius - 4px` | `0.75rem` (12px)  | `rounded-sm`   |

### Container

- Centered, `padding: 2rem`
- Max width at `2xl` breakpoint: `1400px`

### Spacing Approach

Tailwind's default spacing scale. No custom spacing tokens. `gap-1`, `gap-2`, `flex flex-col gap-1` are the primary layout primitives in shared components.

---

## Component Patterns

### Primitives (shadcn/ui)

Located in `components/ui/`. Auto-generated via shadcn CLI. **Never modify directly.**

Import directly — no barrel files:

```ts
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
```

### Shared Components

| Component           | Props                                                         | Pattern                                                                                                    |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PageHeader`        | `title`, `description?`, `action?`, `backHref?`, `className?` | Server component. Back link + title row + optional action slot.                                            |
| `StatusBadge`       | `status: string`, `variant?`, `className?`                    | Wraps shadcn `Badge`. Maps status strings to variants via `STATUS_VARIANT_MAP`. Falls back to `secondary`. |
| `DataTable`         | —                                                             | Shared table with sorting/filtering                                                                        |
| `ConfirmDialog`     | —                                                             | Replaces `window.confirm()`                                                                                |
| `StatsCard`         | —                                                             | Metric display cards                                                                                       |
| `PageSkeleton`      | —                                                             | Full-page loading skeleton                                                                                 |
| `DataTableSkeleton` | —                                                             | Table loading state                                                                                        |
| `EmptyState`        | —                                                             | Zero-data states                                                                                           |
| `FormSection`       | —                                                             | Form layout grouping                                                                                       |

### StatusBadge Variant Map

| Status                           | Variant       |
| -------------------------------- | ------------- |
| active, completed, approved, won | `default`     |
| pending, draft, new, in_review   | `secondary`   |
| overdue, rejected, lost, failed  | `destructive` |
| cancelled, archived, closed      | `outline`     |
| (unknown)                        | `secondary`   |

### CSS Utility Classes (globals.css)

| Class                            | Description                                                          |
| -------------------------------- | -------------------------------------------------------------------- |
| `.construction-header`           | `construction-dark` bg + white text                                  |
| `.construction-card`             | Card with border, rounded-xl, shadow-card, hover:shadow-construction |
| `.construction-button-primary`   | Orange primary button with shadow                                    |
| `.construction-button-secondary` | Muted secondary button with border                                   |
| `.hover-lift`                    | translateY(-2px) + shadow on hover                                   |
| `.glass`                         | White 10% + backdrop blur (dark overlays)                            |
| `.gradient-text`                 | Orange gradient clipped to text                                      |
| `.touch-target`                  | `min-h-[44px] min-w-[44px]` (WCAG touch)                             |
| `.status-online`                 | Pulsing green dot                                                    |
| `.status-offline`                | Static red dot                                                       |

### Domain Components

Located in `components/[Domain]/` (CRM/, Projects/, Estimates/, Finance/, Portals/, Documents/). Only used within their domain routes.

---

## Layout Patterns

### Dashboard (`app/(dashboard)/org/[orgSlug]/`)

- All routes scoped by `orgSlug`
- Sidebar navigation with feature-flag gating
- `PageHeader` at top of each route page
- `Suspense` boundaries with `PageSkeleton` or `DataTableSkeleton` fallbacks

### Settings

- Settings pages under `org/[orgSlug]/settings/`
- Form layout via `FormSection` shared component

### Portal (`app/(portal)/`)

- External client/trade partner access — separate route group from dashboard

---

## Interaction Patterns

### Loading States

- **Never** show "Loading..." text or zeros-while-loading
- Use `PageSkeleton` for full pages, `DataTableSkeleton` for tables
- Wrap async Server Components in `<Suspense fallback={<Skeleton />}>`

### Errors

- Structured responses: `{ error: string, code?: string }`
- `error.tsx` in each route group + `global-error.tsx` at root
- Never expose raw DB errors to the client

### Confirmations

- Use shadcn `AlertDialog` — never `window.confirm()`

### Toasts

- `Toaster` from `sonner` (loaded in root layout)

### Transitions

- `animate-fade-in`: `animate-in fade-in duration-500`
- `animate-slide-up`: `animate-in slide-in-from-bottom-4 duration-500`
- `animate-scale-in`: `animate-in zoom-in-95 duration-300`
- `hover-lift`: transform + shadow (200ms ease-in-out)

---

## Animations

### Tailwind keyframes (tailwind.config.ts)

| Name             | Effect                                               |
| ---------------- | ---------------------------------------------------- |
| `accordion-down` | Height 0 → content height (0.2s ease-out)            |
| `accordion-up`   | Content height → 0 (0.2s ease-out)                   |
| `fade-in`        | opacity 0 + translateY(10px) → 1 + 0 (0.5s ease-out) |
| `slide-up`       | opacity 0 + translateY(20px) → 1 + 0 (0.3s ease-out) |

### CSS keyframes (globals.css)

| Class                    | Effect                                        |
| ------------------------ | --------------------------------------------- |
| `.animate-bounce-gentle` | Subtle 4px vertical bounce, 2s infinite       |
| `.animate-float`         | 6px float up/down, 3s ease-in-out infinite    |
| `.animate-glow`          | Box shadow pulse (primary color), 2s infinite |

All animations are suppressed with 0.01ms duration when `prefers-reduced-motion: reduce`.

---

## Accessibility

- **WCAG AA** — target for all UI
- **Radix UI primitives** — all interactive shadcn/ui components use Radix for ARIA compliance
- **Touch targets:** `.touch-target` class enforces `min-h/w-[44px]`
- **Focus rings:** `:focus-visible` → `ring-2 ring-ring ring-offset-2` (keyboard nav)
- **Reduced motion:** All CSS transitions/animations disabled via `prefers-reduced-motion: reduce`
- **axe-core:** `@axe-core/playwright` runs in CI E2E suite

---

## CSS Architecture

```
app/globals.css
├── @layer base      — CSS custom properties (:root + .dark), body/html defaults, focus-visible
├── @layer components — Utility classes (.construction-*, .hover-lift, .glass, .animate-*)
└── @media           — prefers-reduced-motion override
tailwind.config.ts   — Token mapping, font families, keyframes, shadows, gradients, container
```

---

## Anti-Patterns

1. **Never** modify files in `components/ui/` — update via `npx shadcn@latest add`
2. **Never** use `window.confirm()` or `window.prompt()` — use `AlertDialog` / `Dialog`
3. **Never** show "Loading..." text or zeros — use skeleton components
4. **Never** add a nav item without a corresponding `feature_flags` key in `org_settings`
5. **Never** hardcode org names, colors, or branding — all dynamic via `getOrgBranding()`
6. **Never** use `console.log` — use `lib/logger.ts`
