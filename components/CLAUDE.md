# Components — Conventions

## Structure

```
components/
├── ui/            # shadcn/ui primitives (auto-generated, exempt from size limits)
├── layout/        # App shell: Sidebar, Header, BottomNav, CommandPalette
├── CRM/           # CRM-specific components (LeadCard, OpportunityBoard, etc.)
├── Projects/      # Project management components
├── Estimates/     # Estimating components
├── Finance/       # Finance/dashboard components
├── Portals/       # Client/trade partner portal components
├── Documents/     # Document management components
└── shared/        # Cross-domain reusable components
```

## Server vs Client Components

**Default to Server Components.** Only add `'use client'` when the component needs:

- Event handlers (onClick, onChange, onSubmit)
- useState, useEffect, useRef, or other React hooks
- Browser APIs (window, document, localStorage)
- Third-party client-only libraries

**Pattern for mixed needs:** Server Component wrapper + Client Component child:

```tsx
// ServerWrapper.tsx (no 'use client')
async function ServerWrapper() {
  const data = await fetchData(); // server-side fetch
  return <ClientInteractive initialData={data} />;
}

// ClientInteractive.tsx
('use client');
function ClientInteractive({ initialData }: Props) {
  const [state, setState] = useState(initialData);
  // ... interactive logic
}
```

## Size Limits

- **Max 150 lines** per component file (ESLint enforced)
- When a component grows beyond this, split into sub-components in the same directory
- Extract hooks to `hooks/` directory
- Extract utility functions to `lib/`

## shadcn/ui Usage

- Import directly: `import { Button } from '@/components/ui/button'`
- Never create barrel files that re-export from `ui/`
- Customize via Tailwind classes, not by editing `ui/` source files
- `ui/` files are exempt from size limits (auto-generated)

## Composition Over Props

Prefer composition patterns:

```tsx
// Good: composition
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>{children}</CardContent>
</Card>

// Avoid: deep prop drilling
<Card title="Title" subtitle="Sub" icon={icon} actions={actions} ... />
```
