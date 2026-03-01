# KrewPact Decisions Register

All locked architecture and business decisions for KrewPact, consolidated from the [Architecture Resolution](./KrewPact-Architecture-Resolution.md), [Master Plan](./KrewPact-Master-Plan.md), and [Technology Stack ADRs](./KrewPact-Technology-Stack-ADRs.md).

**Status:** All decisions below are **LOCKED** unless explicitly marked otherwise.
**Last updated:** February 19, 2026

---

## Architecture & Infrastructure Decisions

Source: Architecture Resolution (D1-D12, C1-C7, H1-H8, M1-M8)

| # | Category | Decision | Rationale | Source |
|---|----------|----------|-----------|--------|
| D1 | Database | Managed Supabase Pro tier for MVP; migration path to self-hosted documented for Canadian data residency | Solo developer cannot maintain PostgreSQL ops; $175-295/mo negligible vs dev cost | Resolution |
| D2 | Domain | krewpact.com unified domain; all .io and .internal references removed; ERPNext stays at erp.mdmgroupinc.ca | Single clean namespace | Resolution |
| D3 | Architecture | Hybrid BFF: Vercel API routes for user-facing requests, Cloudflare Tunnel for ERPNext, BullMQ workers on ERPNext machine | Separation of concerns, flexible deployment | Resolution |
| D4 | Queue | Upstash Redis for BullMQ (Vercel-reachable via REST API); self-hosted Redis optional for local caching only | Vercel serverless needs REST API to enqueue; ~$10-30/mo at 300 users | Resolution |
| D5 | RBAC | PRD canonical role model (9 internal + 4 external) is authoritative; Security Framework model retired | Single source of truth | Resolution |
| D6 | Connectivity | Cloudflare Tunnel from ERPNext host (machine-agnostic); tunnel URL configurable via env var per deployment | Zero-trust, no public IP exposure | Resolution |
| D7 | Compliance | Accepted US-hosted Clerk + Supabase with PIPEDA disclosure; field-level encryption for SIN/banking; Canadian migration path documented | PIPEDA requires disclosure, not necessarily residency | Resolution |
| D8 | Integration | Eventual consistency pattern: outbox/inbox, idempotent upsert, retry, dead-letter, compensating transactions; no 2-phase commit | 2PC infeasible across serverless + managed DB | Resolution |
| D9 | Architecture | n8n removed from architecture; BullMQ + BFF API routes handle all orchestration | Unnecessary complexity for MVP | Resolution |
| D10 | Monitoring | MVP: Vercel Analytics + Supabase Dashboard + BetterStack uptime + Sentry; full Prometheus/Grafana deferred | Cost-effective, covers 99.5% SLA | Resolution |
| D11 | Email | Microsoft Graph deferred to post-MVP; Resend for transactional email ($0-20/mo) | Simplifies MVP; no calendar/OneDrive integration needed | Resolution |
| D12 | Uptime | 99.5% uptime for MVP (single-node); 99.9% target post-HA upgrade | 43.8 hrs/year downtime realistic for single-node | Resolution |
| C1 | Database | Managed Supabase Pro, not self-hosted; schema and RLS portable to self-hosted | Solo dev cannot maintain Postgres ops | Resolution |
| C2 | Connectivity | Cloudflare Tunnel: cloudflared on ERPNext host → erp-api.krewpact.com → localhost:8000 | Zero-trust, configurable, no public IP | Resolution |
| C3 | Queue | Upstash Redis for BullMQ; workers on ERPNext host connect via HTTPS | Serverless + managed = REST enqueue | Resolution |
| C4 | RBAC | 13 canonical roles (9 internal + 4 external); PRD is source of truth; SQL seed uses these keys | Single RBAC model across all systems | Resolution |
| C5 | Compliance | Disclosed US-hosted services; field-level encryption for sensitive PII; ERPNext on-prem (Canadian) | PIPEDA + safeguards; migration plan mitigates risk | Resolution |
| C6 | Domain | krewpact.com subdomains: app (Vercel), portal (Vercel), erp-api (Tunnel), erp.mdmgroupinc.ca (internal) | Clean namespace, single TLD | Resolution |
| C7 | Auth | Clerk → Supabase JWT bridge; JWT includes krewpact_user_id, divisions (JSONB), roles; RLS uses auth.jwt() not auth.uid() | O(1) claim evaluation, division scoping via JSONB | Resolution |
| H1 | Scope | P0/P1/P2 phasing; P0 = 12 weeks, ~25 features, 40 endpoints, 30 forms, 12 ERP mappings | Original 70+ features unrealistic for solo+AI | Resolution |
| H2 | Offline | Defer offline to P2; MVP is online-only with graceful degradation | Offline is complex; MVP focuses on ops unification | Resolution |
| H3 | Uptime | 99.5% SLA for MVP; upgrade path: add cluster node ($2-3K) or migrate to managed cloud | Realistic for single-node + ISP | Resolution |
| H4 | Integration | Eventual consistency: outbox → enqueue → worker → ERPNext with idempotency key, backoff, dead-letter | 2PC infeasible across serverless | Resolution |
| H5 | Database | Supabase Supavisor pooler in transaction mode (port 6543) for Vercel serverless; direct (5432) only for long-lived workers | Prevents serverless connection exhaustion | Resolution |
| H6 | Database | 16 minimum required indexes for division scoping, project lookups, CRM, estimating, sync, audit | Required for RLS + query performance | Resolution |
| H7 | Architecture | n8n removed; BullMQ workers + BFF sufficient | Simpler stack | Resolution |
| H8 | Naming | BuildAxis → KrewPact global rename complete; building_axis_id → krewpact_id | Rebrand complete | Resolution |
| M1 | Email | Microsoft Graph cut from MVP; Resend for transactional ($0-20/mo); M365 Phase 2 | Simplifies MVP | Resolution |
| M2 | Monitoring | MVP: Vercel Analytics (free), Supabase Dashboard (free), BetterStack ($0-20/mo), Sentry free tier | Cost-effective; sufficient for MVP SLA | Resolution |
| M3 | Accessibility | axe-core in E2E tests; Radix UI (shadcn/ui) for ARIA; manual audit before client portal (P1) | AODA/WCAG AA target; CI regression check | Resolution |
| M4 | Cost | ~$455-635/mo SaaS: Supabase $175-295, Vercel $20, BoldSign $250, Upstash $10-30, Resend $0-20, BetterStack $0-20, Sentry free | Reasonable for production ops | Resolution |
| M5 | Scope | 30 P0 forms only; reject out-of-scope forms | MVP scope discipline | Resolution |
| M6 | ERP | Pin ERPNext to specific version; upgrade quarterly in staging first | Prevents surprise breaking changes | Resolution |
| M7 | ERP | Run second ERPNext instance for testing (Docker or Frappe Cloud free tier) | Integration testing requires isolation | Resolution |
| M8 | Forms | React Hook Form + Zod for all forms; schemas shared between client and API | Validated, proven, no vendor lock-in | Resolution |

---

## Business & Scope Decisions

Source: Master Plan (MP1-MP19)

| # | Category | Decision | Rationale | Source |
|---|----------|----------|-----------|--------|
| MP1 | Architecture | Hybrid ERPNext-first: ERPNext = finance/procurement/inventory; KrewPact = UX, field ops, portals, orchestration, identity, reporting | Clear separation of concerns | Master Plan |
| MP2 | Timeline | 3-4 month aggressive rollout; revised to P0/P1/P2 phasing (12 weeks P0) | Realistic for solo + AI development | Master Plan |
| MP3 | Hosting | Managed stack (Vercel + Supabase) + private ERPNext bench on-premises | Proven, scalable, minimal ops burden | Master Plan |
| MP4 | Business | Mixed GC (residential + light commercial); single legal entity + divisions | MDM Contracting scope | Master Plan |
| MP5 | Scope | Full core ops + basic finance at go-live; not phased — complete ops unification | Day-1 replacement of Sage Construction Mgmt workflows | Master Plan |
| MP6 | Migration | Full historical migration from Sage 50 + Sage Construction Mgmt + spreadsheets + SMB + OneDrive | Compliance + audit trail requirement | Master Plan |
| MP7 | Portals | Client portal + trade partner portal included in initial release (P0) | External stakeholders included day-1 | Master Plan |
| MP8 | Mobile | Offline capture deferred to P2 (Capacitor + SQLite); MVP = online-only | Offline is complex; focus on ops unification first | Master Plan |
| MP9 | Data Authority | ERPNext authoritative for GL, invoices, payments, inventory, procurement; Supabase for workflows, field ops, portals, audit | No dual sources of truth | Master Plan |
| MP10 | Compliance | Canada-first: CAD + GST/HST/PST; Ontario Construction Act (lien, holdback, notice) in P1 | Legal requirement | Master Plan |
| MP11 | Payroll | Timesheets + ADP integration (nightly API + CSV fallback); no in-house payroll engine | ADP remains authority; KrewPact feeds time data | Master Plan |
| MP12 | Estimating | Production-grade assemblies/templates in MVP; advanced features (cost catalog, markup, alternates) in P2 | Foundation for estimating ops | Master Plan |
| MP13 | Migration Sources | Sage 50 + Sage Construction Mgmt + spreadsheets + SMB + OneDrive; phased bulk import + delta sync | Multiple source systems; migration mapping required | Master Plan |
| MP14 | E-Sign | BoldSign white-label API with abstraction layer for vendor flexibility | Chosen; swap-friendly design | Master Plan |
| MP15 | Payments | Invoice + external payment links; ERPNext posts invoices; external collection; ERP reconciliation | No custom payment ledger | Master Plan |
| MP16 | Org Structure | Single legal company + divisions; not multi-tenant, not multi-company accounting | MDM structure; simpler auth/accounting | Master Plan |
| MP17 | Scale | Up to 300 internal users | Realistic for general contractor | Master Plan |
| MP18 | Reliability | 99.5% uptime MVP (single-node), 99.9% post-HA; RPO 15min, RTO 2h | Operational targets commensurate with scale | Master Plan |
| MP19 | Migration Process | Phased bulk import + delta sync; reconciliation gates (counts, totals, hash, sampling); legacy read-only archive after cutover | Methodical; zero data loss; auditability | Master Plan |

---

## Technology ADR Summaries

Source: [Technology Stack ADRs](./KrewPact-Technology-Stack-ADRs.md) — 25 ADRs

| ADR | Title | Decision |
|-----|-------|----------|
| ADR-001 | Frontend Framework (React + Next.js) | React with Next.js App Router (TypeScript, Server Components, file-based routing) |
| ADR-002 | Backend Architecture (Node.js BFF Pattern) | Node.js BFF (Express.js or Fastify) as aggregation layer for ERPNext, Supabase, ADP, and third-party APIs; implemented as Next.js API routes co-located with frontend |
| ADR-003 | Database Platform (Supabase PostgreSQL) | Supabase managed PostgreSQL 15+ with Row-Level Security, real-time subscriptions, REST API, and built-in backup management |
| ADR-004 | ERP System (ERPNext - Self-Hosted) | ERPNext self-hosted on Proxmox via Frappe; integration exclusively through REST API to maintain GPL v3 boundary; KrewPact contains no ERPNext code |
| ADR-005 | Authentication Provider (Clerk) | Clerk for email/password + M365 SSO, MFA; JWT bridge to Supabase RLS; US-hosted with PIPEDA disclosure |
| ADR-006 | Electronic Signature Provider (BoldSign) | BoldSign (Syncfusion) via REST API; embedded signing; document templates in Supabase; abstraction layer for vendor flexibility |
| ADR-007 | Payroll Integration (ADP Workforce Now) | ADP Workforce Now via REST API and SFTP; BFF orchestrates ADP calls; Supabase caches payroll data for reporting; deferred to P2 |
| ADR-008 | File Storage Strategy | Supabase Storage (recommended) or Cloudflare R2 as S3-compatible fallback; presigned URLs for direct client upload/download; BFF enforces access control |
| ADR-009 | Job Queue and Background Processing | BullMQ with Upstash Redis (REST API for Vercel serverless enqueue); workers run on ERPNext host; pg_cron for scheduled jobs; n8n removed |
| ADR-010 | Frontend Hosting (Vercel) | Vercel for Next.js frontend; native Next.js optimization, preview deployments, edge CDN, automatic HTTPS |
| ADR-011 | ERPNext and Backend Hosting (Self-Hosted - Proxmox) | ERPNext + workers on Proxmox (Docker/LXC); ZFS storage; Cloudflare Tunnel for external connectivity; Tailscale for SSH admin |
| ADR-012 | Inter-Service Networking (Tailscale) | Tailscale overlay network for SSH admin access to Proxmox services; Cloudflare Tunnel (not Tailscale) is primary Vercel→ERPNext connectivity |
| ADR-013 | Reverse Proxy (Nginx Proxy Manager) | Nginx Proxy Manager (Docker) on Proxmox; Let's Encrypt TLS; routes to private Tailscale IPs; request logging enabled |
| ADR-014 | CI/CD Pipeline (GitHub Actions) | GitHub Actions: lint → typecheck → unit test → build → deploy; Vercel deploy on merge to main; Docker image build for backend services |
| ADR-015 | State Management (Frontend) | React Context + useReducer (auth/user state), Tanstack Query / React Query (server state), localStorage (UI preferences); Zustand if needed for complex UI state |
| ADR-016 | API Design (REST vs GraphQL vs tRPC) | REST with conventional CRUD endpoints and query parameter filtering/pagination; BFF exposes REST to frontend |
| ADR-017 | Real-Time Updates Strategy | Supabase Realtime (WebSocket CDC via LISTEN/NOTIFY) for critical data; Server-Sent Events for notifications; polling fallback for poor connectivity |
| ADR-018 | Offline-First Architecture for Field Operations | Deferred to P2; MVP is online-only; P2 will use Watermelon DB for local storage + BFF sync layer with conflict resolution |
| ADR-019 | Multi-Tenancy and Division-Aware Data Model | Database-level RLS with tenant_id + division_id on all tables; Clerk JWT claims drive RLS policies; deny-by-default |
| ADR-020 | Search Infrastructure | Phase 1: PostgreSQL ILIKE for basic substring matching; Phase 2: Meilisearch (self-hosted or cloud) for full-text search with typo tolerance |
| ADR-021 | Notification System Architecture | Phase 1: simple email notifications via Resend on database events; Phase 2: Inngest workflow orchestration for multi-channel notifications |
| ADR-022 | Audit Trail Implementation | Supabase built-in audit logs (automatic DB-level) + application-level audit_events table in BFF for complex business events (approvals, signatures, sensitive data access) |
| ADR-023 | Caching Strategy | Layered: HTTP CDN/browser cache (static = 1yr, stable data = 1hr, volatile = 5min); Tanstack Query client cache with stale-while-revalidate; Upstash Redis for BFF-level cache |
| ADR-024 | Error Handling and Observability | Structured JSON logging (Winston/Pino) to stdout; standardized error response schema with code/message/details/request_id; Sentry for errors; BetterStack for uptime; Vercel Analytics for frontend |
| ADR-025 | Testing Strategy | Vitest + React Testing Library (unit, 60-70% coverage target); Playwright (E2E integration, critical workflow coverage); axe-core/playwright (a11y in CI); visual regression snapshots |

---

## Pending Decisions (Require User Input)

These items from the Architecture Resolution are NOT yet locked:

| # | Decision Needed | Impact | Blocking |
|---|----------------|--------|----------|
| P1 | Supabase region: US East or will Canadian region be available? | Data residency compliance | Before `supabase init` |
| P2 | ERPNext host details: what machine, what OS, is Docker installed? | Cloudflare Tunnel setup | Phase 0, Week 1 |
| P3 | Do you own krewpact.com? Is DNS on Cloudflare? | Domain setup | Phase 0, Week 1 |
| P4 | BoldSign account created? API key available? | E-sign workflow; can be deferred to Phase 2 | Week 7 |
| P5 | Resend vs SendGrid for transactional email? | Email service setup | Phase 1 |
| P6 | Legal counsel budget for GPL review? | Risk mitigation before any white-label distribution | Before white-label |

---

*Source documents: KrewPact-Architecture-Resolution.md, KrewPact-Master-Plan.md, KrewPact-Technology-Stack-ADRs.md*
*Last updated: February 19, 2026*
