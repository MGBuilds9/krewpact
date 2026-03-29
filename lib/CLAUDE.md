# Shared Libraries — Conventions

## Structure

```
lib/
├── ai/               # AI chat, knowledge embeddings, model registry
├── api/              # Server-side API helpers (withApiRoute, errors, org resolution, rate-limit, cron-logger)
├── api-client.ts     # Client-side API wrapper
├── crm/              # CRM business logic (lead assignment, scoring, enrichment)
├── csv/              # CSV export utilities
├── date.ts           # Date formatting utilities
├── email/            # Email sending (Resend integration)
├── env.ts            # Environment variable validation (Zod schema)
├── erp/              # ERPNext API client and sync service
│   ├── client.ts     # ERPNext HTTP client (sole access point)
│   └── sync-service.ts # QStash sync job handlers
├── esign/            # BoldSign e-sign client and types
├── estimating/       # Estimating business logic
├── executive/        # Executive dashboard metrics (Supabase RPC wrappers)
├── format-status.ts  # Status formatting helpers
├── integrations/     # Third-party integration helpers
├── inventory/        # Inventory business logic (replaces Almyta)
├── jobs/             # Background job definitions
├── knowledge/        # RAG/embeddings knowledge layer (pgvector)
├── logger.ts         # Structured logger (never console.log)
├── microsoft/        # Microsoft Graph API client (email, calendar)
├── notifications/    # Notification dispatch service
├── offline/          # Offline/PWA engine (IndexedDB queue, sync, conflict resolution)
│   ├── types.ts      # OfflineQueueItem, entity types, conflict strategies
│   ├── store.ts      # IndexedDB store via idb library
│   ├── sync-engine.ts # Queue processor, retry, auto-sync on reconnect
│   ├── conflict-resolver.ts # Per-entity conflict strategies (deterministic)
│   └── online-detector.ts   # navigator.onLine + heartbeat hybrid
├── pdf/              # PDF generation utilities
├── query-cache.ts    # React Query cache utilities
├── query-client.tsx  # React Query provider
├── query-keys.ts     # React Query key factory
├── queue/            # QStash queue setup and configuration
├── rbac/             # RBAC sync and role utilities
├── request-context.ts # Request context utilities
├── sanitize.ts       # Input sanitization
├── services/         # Domain services (change orders, document control, financial ops, payroll)
├── supabase/         # Supabase clients
│   ├── client.ts     # Browser client (NEXT_PUBLIC_ keys)
│   └── server.ts     # Server client (Clerk JWT → RLS, pooler port 6543)
├── takeoff/          # AI takeoff engine client
├── toast.ts          # Toast notification helpers
├── utils.ts          # General utilities (cn, formatters)
└── validators/       # Shared Zod schemas (one per domain)
```

## Key Conventions

- **Supabase server client** always uses pooler port 6543 (transaction mode) from Vercel serverless
- **Zod schemas** in `validators/` are shared between client forms and API route validation
- **ERPNext client** (`erp/client.ts`) is the only place that talks to ERPNext — never call ERPNext directly from API routes
- **Mostly server/isomorphic code** — exceptions: `query-client.tsx` (React Query provider), `offline/` (client-only, IndexedDB)
- **Offline module** (`offline/`) is client-only (IndexedDB, navigator APIs). The interface is designed to be portable — Phase 4 (Mobile Expo) swaps IndexedDB for SQLite with the same API surface
- **Executive metrics** (`executive/metrics.ts`) delegates to Supabase RPCs — no full-table JS aggregation
- **RBAC** (`rbac/sync-roles.ts`) dual-writes roles to Clerk publicMetadata + Supabase user_roles
- **AI/Knowledge** (`ai/`, `knowledge/`) uses pgvector for semantic search with OpenAI embeddings
