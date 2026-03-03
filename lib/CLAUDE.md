# Shared Libraries — Conventions

## Structure

```
lib/
├── api/              # Server-side API helpers (org resolution, auth)
├── api-client.ts     # Client-side API wrapper
├── crm/              # CRM business logic (lead assignment, scoring)
├── email/            # Email sending (Resend integration)
├── erp/              # ERPNext API client and sync service
│   ├── client.ts     # ERPNext HTTP client
│   └── sync-service.ts # BullMQ sync job handlers
├── estimating/       # Estimating business logic
├── integrations/     # Third-party integrations
├── jobs/             # BullMQ job definitions
├── queue/            # Queue setup and configuration
├── supabase/         # Supabase clients
│   ├── client.ts     # Browser client (NEXT_PUBLIC_ keys)
│   └── server.ts     # Server client (uses pooler port 6543)
├── validators/       # Shared Zod schemas
├── demo-mode.ts      # Demo mode utilities
├── env.ts            # Environment variable validation
├── query-client.tsx  # React Query provider
└── utils.ts          # General utilities (cn, formatters)
```

## Key Conventions

- **Supabase server client** always uses pooler port 6543 (transaction mode) from Vercel serverless
- **Zod schemas** in `validators/` are shared between client forms and API route validation
- **ERPNext client** (`erp/client.ts`) is the only place that talks to ERPNext — never call ERPNext directly from API routes
- **Demo mode** (`demo-mode.ts`) provides mock data when `NEXT_PUBLIC_DEMO_MODE=true`
- **Mostly server/isomorphic code** — exceptions: `query-client.tsx` (React Query provider) and `clerk-demo-client.tsx` (demo mode client)
