# KrewPact Monitoring and Observability Strategy

## 1. OBSERVABILITY STRATEGY

Observability is the foundation of reliable software operations. It enables rapid incident response, performance optimization, and data-driven decision making. KrewPact implements observability through three pillars: metrics, logs, and traces.

### Three Pillars of Observability

**Metrics**
Metrics are numerical measurements of system behavior captured at regular intervals. They answer "what is happening" questions at a glance.

- Time-series data collected at specific points in time
- Dimensions enable slicing and aggregation (by service, by endpoint, by region)
- Typically collected every 15-60 seconds
- Stored efficiently in time-series databases
- Enable alerting on threshold violations
- Provide trending and capacity planning insights
- Low cardinality (finite set of possible values)
- Best for questions like: "Is the API responding slowly?" or "Is CPU usage high?"

**Logs**
Logs are detailed textual records of discrete events. They answer "why did something happen" questions.

- Generated when code executes specific paths
- Include context about the event (timestamp, user, request ID)
- Support full-text search across event details
- Enable debugging of specific incidents
- Generate high volume (retention expensive)
- Best for questions like: "Why did order processing fail?" or "What requests did user X make?"

**Traces**
Traces are records of request flows through distributed systems. They answer "how did a request flow through the system" questions.

- Follow a single request from entry point to completion
- Show latency at each service layer
- Identify bottlenecks and slow operations
- Enable understanding of service dependencies
- Most expensive to store and analyze
- Best for questions like: "Why was this API call slow?" or "What happened to this user's request?"

### Tool Selection Rationale

KrewPact uses a curated set of tools balancing cost, simplicity, and capability.

**Prometheus for Metrics Collection:**
- Open source, self-hosted, no ongoing license costs
- Time-series database optimized for metrics
- Scrape-based collection (services expose metrics endpoints)
- Flexible query language (PromQL)
- Long-term storage capability
- Integration with Grafana for visualization
- Active community and extensive integrations

**Loki for Log Aggregation:**
- Open source, part of Grafana ecosystem
- Indexes labels, not full text (cheaper storage)
- LogQL query language (similar to PromQL)
- Scales well (handles millions of log lines)
- Integration with Grafana dashboards
- Compatible with existing Prometheus infrastructure

**Grafana for Visualization:**
- Open source alerting and visualization platform
- Dashboard creation without coding
- Flexible templating for dynamic dashboards
- Alert definition and notification routing
- Multi-user support with RBAC
- Plugin ecosystem for custom visualizations
- Cost-effective (self-hosted option available)

**Alternative Cloud Option:**
- Grafana Cloud integrates Prometheus, Loki, Tempo
- Managed service (no infrastructure burden)
- Suitable as KrewPact scales
- Higher cost but operational simplicity
- Can migrate from self-hosted later

**OpenTelemetry for Traces (Future):**
- Vendor-neutral instrumentation standard
- Language-agnostic (works across Node.js, Python, etc.)
- Exports to Jaeger, Tempo, or cloud providers
- Planned for future implementation
- Currently using manual logging for trace-like insights

## 2. METRICS

Metrics provide quantitative insights into system health and performance.

### Infrastructure Metrics via Prometheus and Node Exporter

Infrastructure metrics track physical and virtual machine health.

**CPU Metrics:**
- node_cpu_seconds_total: CPU time spent in each mode (user, system, idle)
- rate(node_cpu_seconds_total[5m]): CPU utilization percentage
- node_load1, node_load5, node_load15: Load average over time windows
- Alert when CPU > 80% sustained for 5 minutes

**Memory Metrics:**
- node_memory_MemTotal_bytes: Total system memory
- node_memory_MemAvailable_bytes: Available memory
- Memory utilization = (MemTotal - MemAvailable) / MemTotal
- Alert when memory utilization > 85%
- Alert when available memory < 1GB (out of memory risk)

**Disk Metrics:**
- node_filesystem_avail_bytes: Available disk space
- node_filesystem_size_bytes: Total disk size
- Disk utilization = (size - avail) / size
- Alert when disk > 85% utilized
- Alert when disk free < 5GB (near capacity)

**Network Metrics:**
- node_network_transmit_bytes_total: Bytes transmitted
- node_network_receive_bytes_total: Bytes received
- Calculate rate: rate(node_network_receive_bytes_total[5m])
- Monitor for unexpected traffic patterns
- Detect DDoS attacks or data exfiltration

**Proxmox-Specific Metrics:**
- VM/CT uptime and status
- VM/CT resource allocation and usage
- Backup completion status
- Replication health (if configured)
- ZFS pool health

**ZFS Pool Health Metrics:**
- zpool_status (healthy, degraded, offline)
- zfs_pool_capacity percentage
- zfs_scrub_progress (for running scrubs)
- Alert on degraded or offline states immediately
- Schedule monthly scrubs, monitor completion

**Docker Container Metrics:**
- container_memory_usage_bytes: Memory used by container
- container_cpu_usage_seconds_total: CPU seconds used
- container_network_transmit_bytes_total: Network bytes sent
- container_network_receive_bytes_total: Network bytes received
- Container restart count (detect crash loops)

### Application Metrics

Application metrics track software behavior and performance.

**API Response Time Metrics:**
- http_request_duration_ms: Histogram of request duration
- Percentiles calculated: p50 (median), p95, p99
- Alert when p95 > 500ms
- Alert when p99 > 1000ms
- Track separately by endpoint to identify slow paths

**Error Rate Metrics:**
- http_requests_total: Counter of requests by status code
- http_requests_total{status="5xx"}: Server errors
- http_requests_total{status="4xx"}: Client errors
- Calculate error rate: sum(status=~"5xx") / sum(all)
- Alert when error rate > 1% (5xx errors)
- Alert when error rate > 5% (4xx errors)

**Active Sessions and Users:**
- active_sessions: Current authenticated sessions
- daily_active_users: Unique users per day
- portal_logins_total: Cumulative login count
- Track growth trends over time
- Identify usage patterns

**Background Job Queue Metrics:**
- job_queue_depth: Number of pending jobs
- job_processing_time_ms: How long each job takes
- job_success_total: Successful job completions
- job_failure_total: Failed job completions
- Alert when queue depth > 1000 (backlog)
- Alert when job failure rate > 5%

**ERPNext Synchronization Metrics:**
- erpnext_sync_count_total: Total sync operations
- erpnext_sync_success_total: Successful syncs
- erpnext_sync_failure_total: Failed syncs
- erpnext_sync_duration_ms: Time per sync
- Track by entity type (estimates, contracts, etc.)
- Alert on sync failure for any entity type

**Database Metrics:**
- pg_connections_used: Active database connections
- pg_connections_max: Maximum allowed connections
- pg_stat_database_tup_fetched: Row fetches
- pg_stat_database_tup_returned: Rows returned
- Connection pool utilization alerts (> 80%)
- Slow query detection via pg_stat_statements

**Cache Metrics:**
- redis_connected_clients: Active Redis connections
- redis_used_memory: Memory consumed by Redis
- redis_keys_total: Number of keys in cache
- cache_hit_rate: Successful cache lookups
- Alert on memory usage > 80% of allocated

### Business Metrics

Business metrics track outcomes and KPIs.

**Estimate Metrics:**
- estimates_created_daily: New estimates per day
- estimates_value_total: Total value of estimates
- estimates_avg_value: Average estimate value
- estimates_by_status: Count by status (draft, sent, signed)
- Trend over time (weekly, monthly)

**Contract Metrics:**
- contracts_signed_daily: New contracts per day
- contracts_value_total: Total contract value
- contracts_avg_value: Average contract value
- contracts_by_type: Breakdown by contract type
- Days from estimate to signature (conversion metric)

**Portal Activity Metrics:**
- portal_login_attempts_daily: Login activity
- portal_users_total: Total registered portal users
- portal_active_sessions: Current sessions
- portal_actions_by_type: RFI responses, document views, etc.
- Identify unused portal accounts

**RFI Metrics:**
- rfis_created_daily: New RFIs issued
- rfis_avg_response_time_days: Days to response
- rfis_response_rate: Percentage responded
- rfis_by_status: Count by status
- Track contractor responsiveness

**Change Order Metrics:**
- change_orders_created_daily: New orders per day
- change_orders_processing_time_days: Days from creation to approval
- change_orders_value_total: Total change order value
- change_orders_by_status: Count by status
- Identify bottlenecks in approval process

## 3. LOGGING

Structured logging enables fast debugging and trending analysis.

### Log Architecture

**Structured JSON Logging:**
Log entries are JSON objects, not free-text strings. This enables programmatic filtering and analysis.

**Log Format:**
```json
{
  "timestamp": "2024-03-15T14:23:45.123Z",
  "level": "INFO",
  "service": "api",
  "request_id": "req-abc123def456",
  "user_id": "user-789",
  "action": "estimate_created",
  "message": "Estimate EST-001 created successfully",
  "duration_ms": 234,
  "estimate_id": "EST-001",
  "estimate_value": 50000,
  "tags": ["estimate", "creation"]
}
```

**Log Levels:**
- ERROR: Exception or critical issue (must investigate)
- WARN: Unexpected behavior but application continues
- INFO: Normal operational events (user actions, deployments)
- DEBUG: Detailed diagnostic information (variable values, flow decisions)

**Correlation IDs:**
Every request gets a unique correlation ID. It flows through all services touched by that request.

```
Frontend → API → ERPNext → Database
req-id: abc123 (same throughout)
```

**Implementation (Node.js with pino):**
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

logger.info({ request_id: 'req-abc', user_id: 'user-123' }, 'Estimate created');
```

**Log Sampling:**
- DEBUG logs: 10% sampling (expensive to store)
- INFO logs: 100% sampling (normal operations)
- WARN/ERROR logs: 100% sampling (issues must be captured)
- Configurable per service

### Log Aggregation with Loki and Promtail

**Loki Architecture:**
- Loki server: Ingests, indexes, and stores logs
- Promtail: Agent on each VM/CT that ships logs to Loki
- Simple label-based indexing (not full-text)
- Efficient storage (compressed text)

**Promtail Configuration:**
```yaml
scrape_configs:
  - job_name: api
    static_configs:
      - targets:
          - localhost
        labels:
          service: api
          env: production
    pipeline_stages:
      - json:
          expressions:
            level: level
            service: service
            request_id: request_id
      - labels:
          level:
          service:
          request_id:
```

**Log Sources:**
- Docker container stdout/stderr
- Application log files (syslog format)
- System logs from journald
- All aggregated to single Loki instance

**Log Retention Policy:**
- ERROR/WARN logs: 90 days retention
- INFO logs: 30 days retention
- DEBUG logs: 7 days retention
- Older logs deleted automatically (Loki handles)
- Critical production issues captured longer via snapshots

**Search and Filter:**
LogQL query language enables complex filtering.

```
# Find all API errors from production
{service="api", level="ERROR", env="production"}

# Find requests for specific user
{request_id="req-abc"} | json user_id | user_id="user-789"

# Count errors by endpoint
sum by (endpoint) (count_over_time({level="ERROR"} [5m]))
```

### PII Redaction in Logs

Personally identifiable information is stripped from logs before aggregation.

**PII Types Redacted:**
- Email addresses: redacted to [EMAIL]
- Phone numbers: redacted to [PHONE]
- Social security numbers: redacted to [SSN]
- Credit card numbers: redacted to [CARD]
- API keys and tokens: redacted to [TOKEN]
- Home addresses: redacted to [ADDRESS]

**Implementation (Middleware):**
```typescript
const piiPatterns = [
  { pattern: /[\w\.-]+@[\w\.-]+\.\w+/g, replacement: '[EMAIL]' },
  { pattern: /\d{3}-\d{3}-\d{4}/g, replacement: '[PHONE]' },
  { pattern: /\d{16}/g, replacement: '[CARD]' }
];

function redactPII(text) {
  let result = text;
  piiPatterns.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, replacement);
  });
  return result;
}

logger.info({ message: redactPII(originalMessage) });
```

**Exception Handling:**
- In rare cases, full request logging needed for debugging
- Create separate "debugging" log channel
- Require explicit authentication to view
- Limit access to core team
- Automatic deletion after 7 days

## 4. TRACING (FUTURE IMPLEMENTATION)

Distributed tracing enables deep understanding of request flows.

### OpenTelemetry Instrumentation

OpenTelemetry is the industry standard for instrumenting applications.

**Instrumentation Strategy:**
- Automatic instrumentation for popular libraries (Express, Prisma, HTTP)
- Manual spans for business logic (estimate creation, sync operations)
- Context propagation across service boundaries
- W3C Trace Context headers for interoperability

**Span Attributes:**
```typescript
const span = tracer.startSpan('estimate_creation', {
  attributes: {
    'estimate.id': 'EST-001',
    'estimate.value': 50000,
    'customer.id': 'CUST-123',
    'user.id': 'user-789'
  }
});

// Business logic
estimate.save();

span.setAttributes({
  'estimate.saved': true,
  'database.duration_ms': 234
});

span.end();
```

**Sampling Strategy:**
- Sample 100% of error traces (always capture failures)
- Sample 10% of success traces (cost management)
- Sample 100% of slow traces (> 1 second)
- Adjustable per service and trace type

### Distributed Tracing Storage

Jaeger or Grafana Tempo stores and visualizes traces.

**Jaeger Architecture:**
- Jaeger collector receives spans from applications
- Elasticsearch backend stores trace data
- Jaeger UI visualizes and searches traces
- Query language for trace filtering

**Visualization:**
- Timeline view shows request flow through services
- Latency breakdown by service
- Error and exception details
- Dependency graph of services called

**Trace Analysis Use Cases:**
- "Why was API request slow?" (identify slow service)
- "What's the impact of code change?" (latency comparison)
- "How does sync flow through services?" (dependency understanding)
- "Where do errors originate?" (failure propagation)

## 5. ALERTING

Alerts notify the on-call engineer of issues requiring immediate attention.

### Alert Rules

Alert rules define when to notify the team. The following tables define all alert rules.

**System Availability Alerts:**

| Alert | Condition | Severity | Channel | Escalation |
|-------|-----------|----------|---------|------------|
| API Down | 3 consecutive health checks fail | CRITICAL | Telegram, SMS | Call founder immediately |
| API Slow | p95 response time > 1s for 5 min | HIGH | Telegram | Investigate within 15 min |
| High Error Rate | > 5% 5xx errors for 5 min | HIGH | Telegram | Investigate within 15 min |
| Partial Outage | > 1 service down but others up | MEDIUM | Telegram | Address within 1 hour |

**Infrastructure Alerts:**

| Alert | Condition | Severity | Channel | Escalation |
|-------|-----------|----------|---------|------------|
| CPU High | > 80% for 10 min | MEDIUM | Telegram | Review within 1 hour |
| Memory High | > 85% utilized | MEDIUM | Telegram | Review within 1 hour |
| Disk Full | < 5GB free | HIGH | Telegram, SMS | Investigate immediately |
| Disk Critical | < 1GB free | CRITICAL | Telegram, SMS | Resolve immediately |
| VM Offline | Proxmox VM stopped unexpectedly | HIGH | Telegram, SMS | Restart and investigate |

**Database Alerts:**

| Alert | Condition | Severity | Channel | Escalation |
|-------|-----------|----------|---------|------------|
| Connection Pool High | > 80% of max connections | MEDIUM | Telegram | Review within 30 min |
| Query Slow | Single query > 10s | MEDIUM | Telegram | Investigate and optimize |
| Replication Lag | > 5s lag (if replication enabled) | HIGH | Telegram | Investigate immediately |
| Backup Failed | Last backup > 26 hours ago | HIGH | Telegram | Verify backup health |

**Service Integration Alerts:**

| Alert | Condition | Severity | Channel | Escalation |
|-------|-----------|----------|---------|------------|
| ERPNext Sync Failed | > 10% failed syncs in 1 hour | HIGH | Telegram | Investigate immediately |
| Payment Gateway Down | API returns error for 5 min | CRITICAL | Telegram, SMS | Address immediately |
| Email Service Down | > 10% emails fail to send | MEDIUM | Telegram | Investigate within 30 min |

**Security Alerts:**

| Alert | Condition | Severity | Channel | Escalation |
|-------|-----------|----------|---------|------------|
| Brute Force Attack | > 10 failed logins from IP in 5 min | HIGH | Telegram | Block IP immediately |
| SSL Certificate Expiry | Certificate expires in < 7 days | MEDIUM | Telegram | Renew certificate |
| Unusual API Pattern | Endpoint receives 10x normal traffic | MEDIUM | Telegram | Investigate for attacks |

**Certificate and Renewal Alerts:**

| Alert | Condition | Severity | Channel | Escalation |
|-------|-----------|----------|---------|------------|
| Certificate Expires Soon | < 30 days to expiration | MEDIUM | Telegram | Renew certificate |
| Certificate Expired | Cert no longer valid | CRITICAL | Telegram, SMS | Renew immediately |
| Certificate Renewal Failed | Auto-renewal script failed | HIGH | Telegram, SMS | Manual renewal required |

**Backup and Disaster Recovery Alerts:**

| Alert | Condition | Severity | Channel | Escalation |
|-------|-----------|----------|---------|------------|
| Backup Failed | Scheduled backup did not complete | HIGH | Telegram | Verify and retry |
| Backup Too Old | Last backup > 26 hours ago | HIGH | Telegram, SMS | Run manual backup |
| Restore Test Failed | Monthly restore test failed | HIGH | Telegram | Investigate backup integrity |
| Backup Storage Full | Backup storage > 90% full | MEDIUM | Telegram | Cleanup old backups |

### Notification Channels

**Telegram Bot (Primary)**

The founder prefers Telegram for real-time notifications. A bot sends all alerts directly to a Telegram chat.

**Implementation:**
```typescript
async function sendTelegramAlert(alert: Alert) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const message = `
🚨 ${alert.severity} Alert
${alert.title}
${alert.description}
Time: ${new Date().toISOString()}
  `;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message })
  });
}
```

**Advantages:**
- Mobile notifications on phone
- Easy to acknowledge/dismiss alerts
- Conversation threading for related alerts
- Inline commands (acknowledge, investigate, etc.)
- Works from anywhere (no web UI required)

**Secondary: Email**

Email provides a record of alerts and summary digests.

**Configuration:**
- One email per CRITICAL alert (immediate)
- One email per HIGH alert (batched hourly)
- Daily digest of MEDIUM alerts
- Weekly digest of INFO alerts
- Email retention: 90 days

**Email Format:**
- Subject: [SEVERITY] Alert Title
- HTML template with alert details
- Links to dashboards and logs
- Runbook link for quick resolution
- Unsubscribe option (unlikely to use)

**PagerDuty or OpsGenie (Future)**

As KrewPact team grows, on-call rotations will use PagerDuty.

- Escalation policies route to on-call engineer
- Escalate to manager after 15 min unacknowledged
- Multiple escalation levels as team grows
- Incident tracking and post-mortems
- Schedule management and handoffs

### On-Call Strategy

Initially, the founder handles all alerts. As team grows, formal on-call rotation.

**Current State (Single Person):**
- Founder is primary on-call 24/7
- All alerts go to Telegram (immediate notification)
- Email for non-urgent context
- Contractor can be secondary for critical issues

**Runbooks Attached to Alerts:**

Runbooks provide step-by-step resolution instructions.

```
Alert: API Down

1. Verify service is actually down
   - Ping API endpoint: curl https://api.krewpact.com/health
   - Check API pod status: kubectl get pods

2. Check recent deployments
   - Any deployment in last 30 min?
   - git log --oneline -5
   - If recent bad deploy, rollback

3. Check logs for errors
   - tail -f /var/log/api/error.log
   - Look for connection errors (DB, Redis)

4. Check infrastructure
   - CPU usage: top
   - Memory usage: free -h
   - Disk usage: df -h

5. Restart API service
   - docker compose restart api
   - Wait 30 seconds for startup
   - Verify health endpoint responds

6. If still down, escalate
   - Contact infrastructure team
   - If during business hours, page manager
```

**Runbook Linking:**
- Runbooks stored in repository (markdown)
- Alert rule includes runbook URL
- Accessible from Telegram alert message
- Updated when procedures change
- Version controlled

## 6. DASHBOARDS (GRAFANA)

Grafana dashboards provide visual monitoring of system health.

### System Dashboard

The system dashboard shows infrastructure health at a glance.

**Layout:**
- Top row: Critical metrics (API status, error rate, uptime)
- Second row: System resources (CPU, memory, disk)
- Third row: Network (traffic, connections)
- Fourth row: Storage (ZFS, backups)

**System Status Indicators:**
- 4 gauges showing major service status (green/yellow/red)
- API health (green = responding, yellow = slow, red = down)
- Database status (green = connected, yellow = slow queries, red = unavailable)
- ERPNext sync status (green = recent success, yellow = failures, red = broken)
- Portal status (green = responsive, yellow = slow, red = unavailable)

**CPU and Memory Graphs:**
- CPU utilization by core (line chart)
- Memory usage over time (stacked area chart)
- Load average (line chart with 1m/5m/15m)
- Y-axis: 0-100% for CPU, 0-total for memory
- Time range: Last 24 hours (adjustable)

**Network Traffic:**
- Network in/out by VM (area chart)
- Network bandwidth utilization percentage
- Detect unusual spikes (potential DDoS)
- Per-interface breakdown

**Storage Status:**
- ZFS pool capacity (gauge)
- Disk utilization by VM/CT (bar chart)
- Backup storage usage (gauge)
- Available space warnings

### Application Dashboard

Application dashboard tracks API and portal health.

**API Performance Section:**
- Response time percentiles (p50, p95, p99) as line chart
- Error rate percentage (stacked area chart)
- Requests per second (throughput)
- Breakdown by endpoint (top 10 slowest)

**Portal Activity Section:**
- Active sessions count (gauge)
- Daily active users (line chart)
- Portal actions per minute (counter)
- Login success rate (gauge)

**Business Metrics Section:**
- Daily estimates created (bar chart)
- Daily contracts signed (bar chart)
- Average estimate value (line chart)
- Estimates by status (pie chart)

**Background Jobs Section:**
- Job queue depth (gauge)
- Jobs processed per hour (line chart)
- Job success rate percentage (gauge)
- Job failures by type (table)

### Business Dashboard

Business dashboard tracks operational KPIs.

**Key Metrics Overview:**
- Estimates created (current month)
- Contracts signed (current month)
- Total contract value (current month)
- Average days from estimate to signature

**Estimate Funnel:**
- Estimates sent (count)
- Estimates signed (count)
- Conversion rate % (sent → signed)
- Revenue impact

**RFI Performance:**
- RFIs issued (count)
- RFI response rate %
- Average response time (days)
- Contractor responsiveness ranking

**Change Orders:**
- Change orders created (count)
- Total change order value
- Average processing time (days)
- Change order by status breakdown

**Portal Usage:**
- Daily active portal users (line chart)
- Portal logins per day (bar chart)
- Most active users (table)
- Feature usage (RFI responses, views, etc.)

### ERPNext Sync Dashboard

Sync dashboard monitors integration health.

**Sync Overview:**
- Last sync timestamp (big text)
- Sync status (green = success, red = failure)
- Next scheduled sync (countdown)

**Sync Performance:**
- Sync duration by entity type (bar chart)
- Synced records count per hour (line chart)
- Success vs failure rate (stacked area)

**Entity Status Table:**
- Entity type | Last synced | Record count | Status
- Estimates | 2024-03-15 14:23 | 523 | Syncing
- Contracts | 2024-03-15 14:22 | 312 | Success
- RFIs | 2024-03-15 14:21 | 67 | Success

**Error Details:**
- Sync errors (last 10) in table format
- Error message, time, entity, retry status
- Click to view full error log

**Queue Status:**
- Pending syncs count (gauge)
- Queue processing rate (syncs/minute)
- Estimated time to empty queue

## 7. UPTIME AND SLA MONITORING

Service level objectives ensure reliability expectations are met.

### External Uptime Monitoring

Third-party services monitor uptime from outside the infrastructure.

**UptimeRobot Configuration:**
- API health endpoint checked every 5 minutes
- HTTP status 200 is success
- Timeout: 30 seconds
- Checks from 3 geographic regions
- Alert on first failure (no grace period)

**Check Endpoints:**
- API: https://api.krewpact.com/health
- Portal: https://krewpact.com/api/health
- ERPNext: https://erpnext.krewpact.internal/api/health

**Notifications:**
- SMS on critical downtime (> 5 min)
- Email alert on first failure
- Email digest hourly if still down

### API Health Endpoints

Each service exposes a health endpoint for monitoring.

**Health Check Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-03-15T14:23:45Z",
  "service": "api",
  "version": "2.1.0",
  "checks": {
    "database": {
      "status": "healthy",
      "response_time_ms": 12
    },
    "redis": {
      "status": "healthy",
      "response_time_ms": 5
    },
    "erpnext": {
      "status": "healthy",
      "response_time_ms": 234
    }
  }
}
```

**Health Check Failure (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-03-15T14:24:00Z",
  "service": "api",
  "checks": {
    "database": {
      "status": "unhealthy",
      "error": "Connection timeout"
    },
    "redis": {
      "status": "healthy"
    }
  }
}
```

**Implementation:**
```typescript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    erpnext: await checkERPNext()
  };

  const isHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks
  });
});
```

### SLA Targets and RPO/RTO

Service level agreements define reliability and recovery expectations.

**SLA Table:**

| Service | Target Uptime | RPO | RTO |
|---------|--------------|-----|-----|
| API | 99.9% | 1 hour | 30 minutes |
| Portal | 99.9% | 1 hour | 30 minutes |
| ERPNext | 99.5% | 4 hours | 1 hour |
| Database | 99.95% | 15 minutes | 15 minutes |
| Email | 99% | N/A | N/A |

**Definitions:**
- **Uptime**: Service responds to requests with 200-299 status codes
- **RPO** (Recovery Point Objective): Maximum acceptable data loss (1 hour = last backup minimum)
- **RTO** (Recovery Time Objective): Maximum acceptable downtime before recovery complete

**Uptime Calculation:**
- Uptime % = (Total Time - Downtime) / Total Time × 100
- 99.9% uptime = maximum 43 minutes/month downtime
- 99.95% uptime = maximum 22 minutes/month downtime
- Calculated monthly and reported to stakeholders

**SLA Credits:**
- If uptime < 99.9% in month, founder owes refund to customers
- Per customer basis (some may have higher SLAs)
- Enables customer confidence in service reliability

### Status Page (Optional Public Monitoring)

A public-facing status page shows system status to customers.

**Tools:**
- Atlassian StatusPage.io (paid, professional)
- Cachet (open source, self-hosted)
- Custom implementation (status dashboard publicly accessible)

**What to Include:**
- Current status of all services (operational, degraded, maintenance)
- Incident history (past 30 days)
- Scheduled maintenance window notifications
- Historical uptime graph
- Subscription for status notifications

**What NOT to Include:**
- Internal infrastructure details
- Specific error messages that leak information
- Details that could aid attackers

## 8. SECURITY MONITORING

Security-related metrics track potential threats and suspicious behavior.

**Failed Authentication Attempts:**
- Failed login attempts per user (histogram)
- Failed logins by IP address (detect brute force)
- Alert on > 5 failed attempts from single IP in 5 minutes
- Block IP with automatic firewall rule after threshold
- Log all failed attempts with timestamp, user, IP

**Rate Limit Triggers:**
- API rate limit exceeded events (per user, per IP)
- Exceed 1000 requests/hour = rate limit applied
- Log which endpoint and why
- Alert on sudden spike in rate-limited requests
- Potential DDoS attack pattern detection

**Unusual API Patterns:**
- Endpoint receives 10x normal traffic (anomaly detection)
- Endpoint returns 10x normal error rate
- API called at unusual hours (outside working hours)
- Sudden geographic distribution change (if available)
- Novel user agent or client patterns

**File Access Anomalies:**
- Unauthorized file access attempts (permission denied)
- File downloads by non-owners
- Configuration file access (potential credential theft)
- Log modifications (potential cover-up attempts)
- Alert on any attempt to modify audit logs

**Database Access Monitoring:**
- Unusual query patterns or volumes
- Query execution from unexpected source IPs
- Database user behavior changes
- Queries selecting sensitive columns (PII)
- Schema modifications outside deployment window

**Implementation:**
All security events logged to separate security audit log for compliance.

```typescript
logger.warn({
  event: 'failed_login',
  user: 'user123',
  ip: '192.168.1.100',
  timestamp: new Date().toISOString(),
  reason: 'invalid_password'
});
```

---

This comprehensive monitoring and observability strategy enables KrewPact to detect and respond to issues rapidly, optimize performance, and maintain system reliability as the business scales.
