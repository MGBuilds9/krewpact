# BullMQ Queue Infrastructure Plan

## Problem

ERPNext sync currently runs inline in API routes. No retry, backoff, or dead-letter. Production sync will fail silently on network issues.

## Architecture

```
Vercel API Route → Upstash Redis (REST) → BullMQ Worker (ERPNext host)
                                         ↓
                                    ERPNext API (localhost)
                                         ↓
                                    Dead-letter queue (failed jobs)
```

## Implementation Steps

### 1. Dependencies

```bash
npm install bullmq @upstash/redis
```

### 2. Queue Connection (`lib/queue/connection.ts`)

Upstash Redis adapter for BullMQ. Uses REST API (reachable from Vercel serverless). IORedis-compatible connection for worker on ERPNext host.

### 3. Job Type Definitions (`lib/queue/jobs.ts`)

| Job Type | Source | Target |
|----------|--------|--------|
| `erp.sync.customer` | Account → | ERPNext Customer |
| `erp.sync.contact` | Contact → | ERPNext Contact |
| `erp.sync.opportunity` | Opportunity → | ERPNext Opportunity |
| `erp.sync.quotation` | Estimate → | ERPNext Quotation |
| `erp.sync.sales-order` | Project (contracted) → | ERPNext Sales Order |
| `erp.sync.project` | Project → | ERPNext Project |

### 4. Producer (`lib/queue/producer.ts`)

Enqueue function used by API routes. Replaces inline ERPNext calls.

```ts
export async function enqueueErpSync(
  jobType: string,
  entityId: string,
  payload: Record<string, unknown>,
  options?: { priority?: number; delay?: number }
) { ... }
```

### 5. Worker (`workers/erp-sync-worker.ts`)

BullMQ worker process running on ERPNext host. Connects to Upstash Redis via IORedis.

- Processes jobs sequentially (ERPNext rate limit: 300 req/min)
- Uses existing `lib/erp/client.ts` mapping functions
- Logs to `erp_sync_events` table on success/failure

### 6. Retry Configuration

- Exponential backoff: base 2s, max 60s
- 3 attempts before dead-letter
- Dead-letter queue: `erp-sync-dead-letter`
- Admin notification on dead-letter (via Supabase notification)

### 7. Monitoring Endpoint (`/api/admin/queue-status`)

Returns: active jobs, waiting jobs, failed jobs, dead-letter count. Admin-only (platform_admin role check).

### 8. API Route Updates

Replace inline ERPNext calls in these routes:
- `POST /api/crm/accounts` → enqueue `erp.sync.customer`
- `POST /api/crm/contacts` → enqueue `erp.sync.contact`
- `POST /api/crm/opportunities/[id]/won` → enqueue `erp.sync.sales-order`
- `POST /api/estimates` → enqueue `erp.sync.quotation`

## Env Vars Needed

```
UPSTASH_REDIS_REST_URL=     # Already configured
UPSTASH_REDIS_REST_TOKEN=   # Already configured
```

## Testing Strategy

- Unit tests: mock Redis, verify job enqueue with correct payload
- Integration tests: worker processes mock ERPNext responses
- Dead-letter tests: verify retry exhaustion → dead-letter

## Deployment

1. Deploy worker to ERPNext host via systemd service
2. Update API routes on Vercel (no downtime — enqueue is non-blocking)
3. Monitor dead-letter queue for first 48h
