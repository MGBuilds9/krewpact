# KrewPact Infrastructure and Deployment Architecture

## 1. INFRASTRUCTURE OVERVIEW

KrewPact employs a hybrid cloud-and-edge architecture optimizing for performance, cost, and operational control. The frontend leverages Vercel's global CDN for user-facing applications, while core business logic and data processing runs on self-hosted Proxmox infrastructure with enterprise-grade storage via ZFS.

### Deployment Model

> **RESOLVED (Feb 2026):** See `KrewPact-Architecture-Resolution.md` for locked decisions.
> Supabase is **managed cloud** (not self-hosted). n8n is **removed**. Redis queue uses **Upstash**.
> ERPNext connectivity via **Cloudflare Tunnel** (not Tailscale-only). Monitoring simplified for MVP.

| Component                     | Location                        | Platform                | Rationale                                                                        |
| ----------------------------- | ------------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| Next.js Frontend + API Routes | Vercel                          | CDN / Edge / Serverless | Global distribution, auto-scaling, BFF via API routes                            |
| Supabase PostgreSQL           | Supabase Cloud                  | Managed (Pro tier)      | RLS, Realtime, Storage. Migration to self-hosted if Canadian residency required. |
| ERPNext                       | On-prem Linux host              | Docker / Frappe Bench   | Finance source-of-truth. Exposed via Cloudflare Tunnel.                          |
| BullMQ Workers                | ERPNext host                    | Node.js process         | Sync workers co-located with ERPNext for direct access                           |
| Redis (Queue)                 | Upstash                         | Managed cloud           | REST API reachable from Vercel serverless                                        |
| Monitoring (MVP)              | Vercel + Supabase + BetterStack | Managed services        | Deferred: Prometheus/Loki/Grafana for post-launch                                |
| Backup Server                 | On-prem (optional)              | ZFS snapshots           | ERPNext + local data. Supabase handles its own backups.                          |
| Dev/Staging                   | Local + Vercel Preview          | Docker + Vercel         | Feature testing via preview deployments                                          |

### Architecture Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Global Users                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Vercel (CDN)      │
                    │  Next.js Frontend   │
                    │  Edge Functions     │
                    └──────────┬──────────┘
                               │ HTTPS
                    ┌──────────┴──────────┐
                    │  Tailscale VPN      │
                    │  (Secure Overlay)   │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        │         Proxmox Cluster (On-Prem)           │
        │      ZFS Storage, GPU Passthrough           │
        │                                              │
        │  ┌─────────────────────────────────────┐    │
        │  │  Nginx Proxy Manager (CT)           │    │
        │  │  TLS Termination, Reverse Proxy     │    │
        │  └──┬───────────────────────────────┬──┘    │
        │     │                               │       │
        │  ┌──┴──┐  ┌──────────┐  ┌────────┐ │       │
        │  │Node │  │ ERPNext  │  │n8n     │ │       │
        │  │APIs │  │ (VM)     │  │Automation│       │
        │  │(CT) │  │          │  │(CT)    │ │       │
        │  └──┬──┘  └──────────┘  └────────┘ │       │
        │     │     ┌──────────────┐          │       │
        │     └────→│   Redis (CT) │←─────────┘       │
        │           └──────────────┘                  │
        │           ┌──────────────┐                  │
        │           │ Supabase PG  │                  │
        │           │ (VM)         │                  │
        │           └──────────────┘                  │
        │           ┌──────────────┐                  │
        │           │ Monitoring   │                  │
        │           │ Prometheus   │                  │
        │           │ Grafana (CT) │                  │
        │           └──────────────┘                  │
        │           ┌──────────────┐                  │
        │           │ Backup Srv   │                  │
        │           │ (VM/CT)      │                  │
        │           └──────────────┘                  │
        └──────────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │   TP-Link Omada Network      │
                │ ER605 / OC200 / SG2008P     │
                │ VLAN Isolation, 802.1X      │
                └──────────────────────────────┘
```

---

## 2. SELF-HOSTED INFRASTRUCTURE (PROXMOX)

### Proxmox Host Configuration

**Hardware Baseline (Single-Node)**

- CPU: 16+ cores (Intel Xeon / AMD EPYC recommended for reliability)
- RAM: 128 GB minimum (256 GB recommended for 500+ concurrent users)
- Storage: 2x NVMe for ZFS RAID-1 (boot), 4x HDD for ZFS RAID-6 (data)
- Network: Dual 10GbE NICs (active-passive) for redundancy
- GPU: Optional NVIDIA (for ML workloads, video processing)
- PSU: 1000W+ (85% efficiency rating)

**Proxmox Configuration**

- OS: Proxmox VE 8.x (based on Debian 12)
- Kernel: Standard + ZFS modules compiled
- Memory Management: Enable KSM (kernel same-page merging) for CT density
- CPU Cgroup: Set up cpu.max limits per container
- Iommu: Enabled for GPU/NIC passthrough

### ZFS Pool Layout

```
Storage Architecture:

zpool create tank mirror nvme0n1 nvme1n1  # Boot/OS (RAID-1)
  - datasets:
    - tank/vm (VMs, snapshots hourly)
    - tank/vm/supabase (PostgreSQL data)
    - tank/vm/erpnext (ERP database)
    - tank/vm/backup (backup target)
    - tank/ct (containers, snapshots daily)
    - tank/ct/nginx (reverse proxy CT)
    - tank/ct/redis (in-memory cache CT)
    - tank/ct/node-api (API container CT)
    - tank/ct/n8n (automation CT)
    - tank/ct/monitoring (prometheus/grafana CT)
    - tank/shared (shared volumes for apps)

zpool create data raidz2 sda sdb sdc sdd  # Large-capacity RAID-6
  - datasets:
    - data/backups (external backup targets)
    - data/media (document/file storage)
    - data/archives (cold storage tier)

ZFS Settings:
  - compression: lz4 (tank), gzip-9 (data)
  - atime: off (reduces IO)
  - recordsize: 128k (default, suitable for mixed workloads)
  - copies: 2 (redundancy at dataset level)
  - sync: always (data integrity critical for DB VMs)
  - snapshots: hourly for VMs, daily for CTs, retained for 30 days
```

### VM/CT Allocation Matrix

| Resource                     | vCPU | RAM   | Storage                       | Network                | Isolation | Purpose                                                    |
| ---------------------------- | ---- | ----- | ----------------------------- | ---------------------- | --------- | ---------------------------------------------------------- |
| **Supabase PostgreSQL (VM)** | 8    | 32 GB | 500 GB SSD (tank/vm/supabase) | VLAN 30 (Database)     | High      | Production database, realtime subscriptions, multi-tenancy |
| **ERPNext (VM)**             | 8    | 32 GB | 300 GB SSD (tank/vm/erpnext)  | VLAN 20 (Production)   | High      | Accounting, inventory, HR workflows                        |
| **Node.js API (CT)**         | 4    | 8 GB  | 100 GB (tank/ct/node-api)     | VLAN 20 (Production)   | Medium    | REST/GraphQL APIs, business logic                          |
| **Redis Cache (CT)**         | 2    | 16 GB | 50 GB (tank/ct/redis)         | VLAN 20 (Production)   | Medium    | Session storage, cache invalidation                        |
| **Nginx Proxy Manager (CT)** | 2    | 4 GB  | 30 GB (tank/ct/nginx)         | VLAN 10 (DMZ), VLAN 20 | Low       | TLS termination, load balancing, proxy                     |
| **Monitoring (CT)**          | 4    | 8 GB  | 200 GB (tank/ct/monitoring)   | VLAN 20 (Production)   | Medium    | Prometheus scraping, Grafana dashboards                    |
| **Backup Server (VM)**       | 4    | 16 GB | 2 TB (data/backups)           | VLAN 40 (Backup)       | High      | Backup aggregation, encryption, retention                  |
| **n8n Automation (CT)**      | 4    | 8 GB  | 100 GB (tank/ct/n8n)          | VLAN 20 (Production)   | Medium    | Workflow orchestration, ERP sync, webhooks                 |
| **Dev/Staging (CT)**         | 6    | 12 GB | 150 GB (tank/ct/staging)      | VLAN 50 (Development)  | Low       | Feature testing, QA deployments, integration tests         |

### VM Boot Order & Startup Services

```
Boot Sequence (ordinal):
1. Supabase PostgreSQL (VM) - All other services wait for DB connectivity
2. Redis Cache (CT) - Session/cache tier dependency
3. Node.js API (CT) - Core business logic
4. ERPNext (VM) - Accounting/ERP workflows
5. Nginx Proxy Manager (CT) - Front-facing ingress
6. n8n Automation (CT) - Trigger workflows post-sync
7. Monitoring (CT) - Dashboard population
8. Dev/Staging (CT) - Non-critical, starts last
9. Backup Server (VM) - Scheduled, not always on

Startup timeouts:
  - Wait for Supabase PGQL port (5432) availability: 120s
  - Wait for Redis PING: 60s
  - Container healthchecks: TCP + HTTP endpoints
```

### Storage Architecture Deep Dive

**ZFS Snapshot Strategy**

```
Hourly Snapshots (tank/vm/supabase):
  snapshot_cron: */1 * * * * /usr/local/bin/snapshot-hourly.sh
  retention: Keep 24 hourly + 7 daily + 4 weekly
  naming: tank/vm/supabase@hourly-2025-02-09T14:00:00Z

Daily Snapshots (tank/vm/erpnext):
  snapshot_cron: 0 2 * * * /usr/local/bin/snapshot-daily.sh
  retention: Keep 30 daily + 12 monthly
  naming: tank/vm/erpnext@daily-2025-02-09

CT Snapshots (task/ct/*):
  frequency: Daily at 03:00 UTC
  retention: 7 snapshots
  critical for: Container rollback, disaster recovery
```

**Replication and Offsite Backup**

```
Primary → Backup Server (local):
  - Daily ZFS send/recv from tank/vm/* to data/backups/*
  - Incremental transfers after initial sync
  - Timestamp: -send {full|incremental} tank/vm/supabase@daily-2025-02-09

Backup Server → Cloud Archive (quarterly):
  - rsync encrypted dumps to S3-compatible storage
  - Compress: gzip -9, encrypt: openssl enc -aes-256-cbc
  - Retention: 7 years for compliance
  - Cost: ~$50/TB/year for cold storage
```

---

## 3. NETWORK ARCHITECTURE

### VLAN Design & Isolation

| VLAN ID | Name               | Subnet        | Purpose                             | Access Rules                                     | Broadcast Isolation |
| ------- | ------------------ | ------------- | ----------------------------------- | ------------------------------------------------ | ------------------- |
| 1       | Management         | 10.0.1.0/24   | Proxmox Web UI, SSH, IPMI           | SSH key only, no password                        | Yes                 |
| 10      | DMZ                | 10.0.10.0/24  | Nginx Proxy Manager, public ingress | TCP 80, 443 from WAN; internal only              | Yes                 |
| 20      | Production         | 10.0.20.0/24  | Node APIs, Redis, ERPNext, n8n      | VLAN 20 ↔ VLAN 30 (DB), VLAN 10 (proxy)          | Yes                 |
| 30      | Database           | 10.0.30.0/24  | Supabase PostgreSQL primary         | Inbound from VLAN 20 only (port 5432)            | Yes                 |
| 40      | Backup             | 10.0.40.0/24  | Backup server, offsite staging      | VLAN 20 → 40 (push backups), VLAN 30 (snapshots) | Yes                 |
| 50      | Development        | 10.0.50.0/24  | Dev/Staging containers, CI/CD       | No access to VLAN 30 (production DB)             | Yes                 |
| 100     | IoT/Infrastructure | 10.0.100.0/24 | TP-Link Omada controllers, switches | SSH/SNMP from VLAN 1 only                        | Yes                 |

### TP-Link Omada Network Components

**Hardware Stack**

| Device                  | Model                                  | Purpose                                                | Port Count         | Function                                   |
| ----------------------- | -------------------------------------- | ------------------------------------------------------ | ------------------ | ------------------------------------------ |
| **Wireless Controller** | OC200 (Cloud-based alternative: OC300) | Network management, SSID provisioning, traffic shaping | N/A (software)     | Centralized AP management, VLAN automation |
| **Gateway/Router**      | ER605 (PoE budget: 95W)                | Primary gateway, VLAN routing, firewall, QoS           | 5x Gigabit (1 WAN) | Routing between VLANs, threat defense      |
| **Managed Switch**      | SG2008P (8x Gigabit, PoE budget: 250W) | VLAN switching, AP/device PoE                          | 8 Gigabit + 1 SFP  | VLAN tagging, loop protection (RSTP)       |

**TP-Link Omada SDN Configuration**

```
Controller (OC200):
  - Manage ER605 gateway, SG2008P switch, multiple APs
  - VLAN Definition:
    - VLAN 1 (Management): ER605 IP 10.0.1.1/24
    - VLAN 10 (DMZ): 10.0.10.1/24 (host: Nginx Proxy)
    - VLAN 20 (Production): 10.0.20.1/24 (host: API, Redis, ERPNext)
    - VLAN 30 (Database): 10.0.30.1/24 (host: PostgreSQL)
    - VLAN 40 (Backup): 10.0.40.1/24 (host: Backup server)
    - VLAN 50 (Development): 10.0.50.1/24 (host: Dev containers)
    - VLAN 100 (IoT): 10.0.100.0/24 (device registration)

Gateway (ER605):
  - WAN Interface: DHCP or static from ISP
  - LAN: Trunk all VLANs to SG2008P
  - DHCP Server: Per-VLAN (scopes defined below)
  - Static Routes: Default via ISP gateway
  - Firewall: Stateful inspection, DPI enabled

Switch (SG2008P):
  - Port 1: Uplink to ER605 (trunk all VLANs)
  - Ports 2-4: Access ports VLAN 20 (Proxmox physical NICs)
  - Ports 5-6: Access ports VLAN 1 (Management)
  - Port 7: Access port VLAN 10 (DMZ egress)
  - Port 8: Reserved/future expansion
  - Port 9 (SFP): Optional fiber uplink for future site replication
  - RSTP enabled: Loop prevention
  - Storm Control: Broadcast limit 256 kbps
```

**DHCP Configuration (ER605)**

```
VLAN 1 (Management): 10.0.1.100-10.0.1.200, lease 12h
VLAN 10 (DMZ): 10.0.10.100-10.0.10.200, lease 8h
VLAN 20 (Production): 10.0.20.100-10.0.20.250, lease 8h
VLAN 30 (Database): 10.0.30.100-10.0.30.200, lease 24h
VLAN 40 (Backup): 10.0.40.100-10.0.40.200, lease 24h
VLAN 50 (Development): 10.0.50.100-10.0.50.200, lease 4h
VLAN 100 (IoT): 10.0.100.50-10.0.100.150, lease 1h

DNS Push: All VLANs → Proxmox DNS relay (10.0.1.50)
Gateway Push: All VLANs → ER605 (VLAN-specific gateways)
```

### Tailscale Overlay VPN

**Deployment Model**

```
Tailscale serves as a secondary encrypted network layer, enabling:
- Remote admin access (secure SSH tunneling)
- Site-to-site connectivity (future multi-location deployments)
- Zero-trust device enrollment (MagicDNS, ACLs)

Components:
  - Tailscale Exit Node: Proxmox host (10.0.1.10 physical → 100.x.x.x Tailscale IP)
  - Tailscale Auth: OAuth via GitHub, OIDC for future IdP
  - MagicDNS: tailscale.io domain registration
  - Funnel: Potential public web access (disabled by default)
```

**Tailscale ACL Policy**

```yaml
# /etc/tailscale/policy.hujson
{ 'acls': [
      # Admin access to Proxmox Web UI
      { 'action': 'accept', 'src': ['tag:admin'], 'dst': ['proxmox:100'] },
      # Production services accessible from mobile
      { 'action': 'accept', 'src': ['tag:ops'], 'dst': ['api:443', 'erp:443', 'redis:6379'] },
      # Cross-container communication over Tailscale
      { 'action': 'accept', 'src': ['proxmox:100'], 'dst': ['*'] },
    ], 'hosts': { 'proxmox': '100.x.x.x', 'api': '10.0.20.50', 'erp': '10.0.20.51', 'redis': '10.0.20.60', 'backup': '10.0.40.10' }, 'tagOwners': { 'tag:admin': ['your-github-user'], 'tag:ops': ['your-github-user'] } }
```

**Subnet Routing (Future Multi-Node)**

```
Enable Proxmox VLAN routing via Tailscale:
  - Exit node: 10.0.20.0/24 and 10.0.30.0/24 reachable via Tailscale
  - Remote users: Access production services without VPN client
  - Syntax: tailscale up --advertise-routes=10.0.20.0/24,10.0.30.0/24 --exit-node=self
```

### DNS and TLS Certificates

**DNS Strategy**

```
Primary: Cloudflare (API-driven zone management)
  - Zone: krewpact.io
  - Records:
    - *.krewpact.io → CNAME to Vercel CDN
    - api.krewpact.io → CNAME to Nginx Proxy (10.0.10.x), or A record to public IP
    - images.krewpact.io → CNAME to Cloudflare Workers (image optimization)
    - erp.krewpact.io → A record (internal, tunneled via Tailscale)
    - mail.krewpact.io → MX record to external mail service
  - TTL: 300s (production), 3600s (stable)
  - DNSSEC: Enabled for domain security

Secondary: Proxmox dnsmasq (internal resolution)
  - Listen: 10.0.1.50:53
  - Forward: Cloudflare 1.1.1.1, 1.0.0.1
  - Local: *.lan → /etc/dnsmasq.d/local.conf
  - Cache: 5000 entries, 24h TTL
```

**TLS Certificate Management**

```
Authority: Let's Encrypt (ACME v2 protocol)
  - Certificate: wildcard *.krewpact.io + root krewpact.io
  - Provisioner: Certbot (renewal via cron)
  - Validation: DNS-01 challenge (Cloudflare plugin)
  - Auto-renewal: 30 days before expiration
  - Storage: /etc/letsencrypt/live/krewpact.io/
    - cert.pem (public certificate)
    - privkey.pem (private key, 0600 root-only)
    - chain.pem (CA chain)
  - Reload: Nginx Proxy Manager auto-reloads on renewal

Backup certificates: Stored in ZFS snapshots, offsite backups

Intermediate Certificates:
  - R3 (current, expires 2025-09-15)
  - Backup: R4 (rollover ready)
  - Chain depth: Root CA → Intermediate → Server cert (3-level)
```

### Firewall Rules

| Source                | Destination          | Port     | Protocol | Action               | Comment                        |
| --------------------- | -------------------- | -------- | -------- | -------------------- | ------------------------------ |
| WAN (ISP)             | VLAN 10 (DMZ)        | 80, 443  | TCP      | ACCEPT               | HTTP/HTTPS ingress only        |
| VLAN 1 (Management)   | VLAN 20, 30, 40, 50  | All      | Any      | ACCEPT               | Admin access to all zones      |
| VLAN 20 (Production)  | VLAN 30 (Database)   | 5432     | TCP      | ACCEPT               | PostgreSQL query port          |
| VLAN 20 (Production)  | VLAN 40 (Backup)     | 22, 9100 | TCP      | ACCEPT               | Backup sync, Prometheus scrape |
| VLAN 10 (DMZ)         | VLAN 20 (Production) | 80, 443  | TCP      | ACCEPT               | Proxy to backend services      |
| VLAN 50 (Development) | VLAN 30 (Database)   | Any      | Any      | REJECT               | Prevent dev from prod DB       |
| VLAN 50 (Development) | VLAN 20 (Production) | 443      | TCP      | ACCEPT (limited)     | Dev-to-prod API calls only     |
| Any VLAN              | VLAN 100 (IoT/Infra) | 22, 161  | TCP/UDP  | ACCEPT (from VLAN 1) | SSH, SNMP management           |
| Any VLAN              | WAN (ISP)            | 53, 123  | UDP      | ACCEPT               | DNS, NTP outbound              |
| VLAN 20, 30, 40       | WAN (ISP)            | 443      | TCP      | ACCEPT               | Outbound HTTPS (updates)       |

**Rate Limiting & DPI**

```
ER605 Configuration:
  - SYN flood protection: Enable, threshold 100 syn/sec
  - Port scan detection: Enable, alert on 10+ ports in 60s
  - Intrusion prevention: Disable by default (CPU cost)
  - Per-connection rate limit: 1 Gbps default (adjust per VLAN)
  - QoS: Prioritize VLAN 30 (database) and VLAN 1 (management)
    - Traffic shaping: Limit VLAN 50 (dev) to 100 Mbps

Nginx Proxy Manager:
  - Rate limiting: 100 req/min per IP per location
  - Timeouts: 60s read, 60s write, 10s connect
  - Buffer sizes: 8k client_body_buffer, 32k client_header_buffer
```

---

## 4. VERCEL DEPLOYMENT (FRONTEND)

### Next.js Application Configuration

**Project Structure**

```
krewpact-web/
├── next.config.mjs                 # Next.js config, image optimization
├── tailwind.config.js              # Tailwind CSS, design tokens
├── tsconfig.json                   # TypeScript strict mode
├── .env.local                      # (dev) Local overrides
├── .env.production                 # (prod) Environment variables
├── pages/
│   ├── index.tsx                   # Dashboard landing
│   ├── projects/[id].tsx           # Project detail view
│   ├── teams/[id]/members.tsx      # Team management
│   ├── api/                        # API routes (edge functions)
│   │   ├── auth/[...nextauth].ts   # NextAuth.js configuration
│   │   ├── webhooks/stripe.ts      # Stripe webhook processor
│   │   └── realtime-subscribe.ts   # Supabase Realtime proxy
│   └── _document.tsx               # Custom document (fonts, meta)
├── components/
│   ├── Layout.tsx                  # App shell, navigation
│   ├── Dashboard.tsx               # KPI display, charts
│   ├── Forms/                      # Reusable form components
│   └── Providers.tsx               # Context providers (auth, theme)
├── lib/
│   ├── api.ts                      # Axios client, interceptors
│   ├── supabase.ts                 # Supabase client initialization
│   ├── hooks/                      # Custom React hooks
│   └── utils/                      # Utility functions
├── public/
│   ├── logo.svg                    # Brand assets
│   └── images/                     # Optimized images
└── styles/
    ├── globals.css                 # Global tailwind imports
    └── variables.css               # CSS custom properties (colors)
```

**next.config.mjs**

```javascript
import withBundleAnalyzer from '@next/bundle-analyzer';

const withBundleConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleConfig({
  reactStrictMode: true,
  swcMinify: true,

  // Image optimization
  images: {
    remotePatterns: [{ hostname: 'images.krewpact.io' }, { hostname: 'cdn.krewpact.io' }],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    cache: 31536000, // 1 year
  },

  // Internationalization (future: multi-language support)
  i18n: {
    locales: ['en', 'es', 'fr'],
    defaultLocale: 'en',
  },

  // API route compression
  compress: true,

  // Serverless function timeout
  serverlessFunctionDuration: 30,

  // Experimental features
  experimental: {
    optimizePackageImports: ['@mui/material', 'date-fns'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Redirects (SEO)
  async redirects() {
    return [
      {
        source: '/blog',
        destination: '/resources/blog',
        permanent: true,
      },
    ];
  },
});
```

**Environment Variables (.env.production)**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://supabase.krewpact.io
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...xxxx (published key only)
SUPABASE_SERVICE_ROLE_KEY=xxxxx... (server-side only, never expose)

# API Gateway
NEXT_PUBLIC_API_URL=https://api.krewpact.io
API_SECRET_KEY=xxxxx... (server-side, for internal API calls)

# Authentication (NextAuth.js)
NEXTAUTH_SECRET=xxxxx... (random 32+ char)
NEXTAUTH_URL=https://krewpact.io
GITHUB_ID=xxxxx...
GITHUB_SECRET=xxxxx...

# Third-party Services
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx...
STRIPE_SECRET_KEY=sk_live_xxxxx...
SENDGRID_API_KEY=SG.xxxxx...

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx...@sentry.io/xxxxx...
LOG_LEVEL=info

# Feature Flags
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Vercel Deployment Strategy

**Preview Deployments**

```
Trigger: Every GitHub PR to main, staging branches
- Generate preview URL: https://krewpact-pr-123.vercel.app
- Environment: .env.preview (test API keys, staging Supabase)
- Automated: Comment PR with preview link
- Retention: 72 hours post-merge
- Performance: Test Core Web Vitals, Lighthouse scores
- Deploy log: Capture build time, bundle size changes
```

**Production Deployment**

```
Trigger: Merge to main branch
- Build command: npm run build (Next.js compilation)
- Install command: npm ci (exact lock file resolution)
- Output directory: .next (Vercel standard)
- Regions: US East (primary), Europe West (replication)
- Automatic rollback: If Web Vitals degrade >10%
- Deployment time: ~2-3 minutes (build) + ~30s (propagation)
```

**Edge Functions for Dynamic Performance**

```typescript
// api/middleware.ts - Rate limiting, geolocation, response caching
import { NextRequest, NextResponse } from 'next/server';

export const config = { matcher: ['/api/:path*'] };

export async function middleware(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for');
  const country = request.headers.get('cf-ipcountry');

  // Rate limit: 100 req/min per IP
  const cacheKey = `rate:${clientIp}`;
  const cache = await caches.open('rate-limit');
  const cached = await cache.match(new Request(cacheKey));

  if (cached) {
    const count = parseInt(await cached.text()) + 1;
    if (count > 100) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
  }

  // Serve stale content if origin down
  const response = await fetch(request);
  response.headers.set('Cache-Control', 'public, s-maxage=3600');

  return response;
}
```

### Core Web Vitals Targets

| Metric                             | Target  | Tool                   | Action on Failure                           |
| ---------------------------------- | ------- | ---------------------- | ------------------------------------------- |
| **LCP** (Largest Contentful Paint) | < 2.5s  | Lighthouse, Sentry RUM | Optimize image sizes, defer non-critical JS |
| **FID** (First Input Delay)        | < 100ms | Sentry, Chrome RUM     | Reduce main thread blocking, code split     |
| **CLS** (Cumulative Layout Shift)  | < 0.1   | Lighthouse, Sentry     | Reserve space for ads, fonts, images        |
| **TTFB** (Time to First Byte)      | < 600ms | Vercel Analytics       | Cache static content, optimize API          |
| **FCP** (First Contentful Paint)   | < 1.8s  | Lighthouse             | Inline critical CSS, defer parsing JS       |

**Performance Monitoring**

```
Vercel Analytics Dashboard:
  - Real User Monitoring (RUM) via Vercel SDK
  - Segment by device type, geography, connection speed
  - Alerts: LCP > 3s on 5% of page views
  - Continuous: Export to DataDog for correlation with backend metrics

Sentry.io Integration:
  - Capture frontend errors, stack traces
  - Session replay for critical user paths
  - Alert: Error rate > 1%
  - Release tracking: Map errors to git commits
```

---

## 5. SUPABASE DEPLOYMENT

### Self-Hosted vs Cloud Decision Matrix

| Aspect                      | Self-Hosted (Recommended for KrewPact)  | Supabase Cloud                     |
| --------------------------- | --------------------------------------- | ---------------------------------- |
| **Cost (500 users)**        | $500/month hardware (amortized)         | $2000-5000/month                   |
| **Data Residency**          | Full control, on-prem                   | Supabase managed regions           |
| **Backup Control**          | 3-2-1 strategy, custom retention        | Daily backups, 35-day retention    |
| **Performance**             | LAN latency (1-5ms), no API rate limits | 1-50ms via HTTPS, metered requests |
| **Scaling**                 | Vertical then horizontal (cluster)      | Automatic, transparent pricing     |
| **Compliance**              | HIPAA, GDPR feasible                    | Shared infrastructure, SOC2 only   |
| **Downtime Risk**           | Dependent on infrastructure             | 99.9% SLA, multiple failovers      |
| **Real-time Subscriptions** | Full control, internal network          | Rate-limited, $100+/month          |

**Selected: Self-hosted PostgreSQL on Proxmox (Cost + Control)**

### PostgreSQL Configuration (Self-Hosted VM)

**VM Specifications**

- vCPU: 8 cores (pinned to NUMA node if multi-socket)
- RAM: 32 GB (16 GB shared_buffers, 16 GB OS cache)
- Storage: 500 GB NVMe on ZFS dataset (tank/vm/supabase)
- Network: VLAN 30 (Database), no outbound internet

**postgresql.conf Tuning**

```sql
-- Memory management
shared_buffers = 8GB              # 25% of system RAM
effective_cache_size = 24GB       # 75% of system RAM
maintenance_work_mem = 2GB        # For VACUUM, CREATE INDEX
work_mem = 32MB                   # Per-operation memory (RAM / max_connections)

-- Parallel execution (PostgreSQL 13+)
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_worker_processes = 8

-- Connection pooling (internal)
max_connections = 200             # Limit, will use PgBouncer
superuser_reserved_connections = 10

-- WAL (Write-Ahead Log)
wal_buffers = 16MB                # Transaction log buffer
checkpoint_timeout = 15min        # Balance write load
checkpoint_completion_target = 0.9
wal_level = replica               # Enable replication, streaming backups
max_wal_senders = 3               # For replication, backups

-- Query optimization
random_page_cost = 1.1            # ZFS NVMe, low randomness cost
effective_io_concurrency = 200    # SSD, concurrent IO ops
jit = on                          # JIT compilation for long queries

-- Logging
log_min_duration_statement = 1000 # Log queries slower than 1s
log_connections = on
log_disconnections = on
log_statement = 'all'             # For audit, set to 'mod' in prod
log_duration = on
log_checkpoints = on
```

**pg_hba.conf (Host-Based Authentication)**

```
# IPv4 local connections
host    all             all             127.0.0.1/32            md5

# VLAN 20 (Production APIs) - trusted internal
host    krewpact       api_user        10.0.20.0/24            md5

# VLAN 40 (Backup server) - backup user
host    all             postgres        10.0.40.10/32           md5

# Reject all else
host    all             all             0.0.0.0/0               reject
```

### Connection Pooling (PgBouncer)

**Architecture**

```
┌──────────────────────────────────────┐
│  Node.js API (10 processes)          │
│  Each: 5 connections to PgBouncer    │
└──────────────┬───────────────────────┘
               │
        ┌──────┴──────┐
        │  PgBouncer  │
        │  (CT)       │
        │  Pool: 50   │
        │  Reserve: 5 │
        └──────┬──────┘
               │
        ┌──────┴──────────────────┐
        │ PostgreSQL (VM)         │
        │ max_connections: 200    │
        │ Client count: 30-50     │
        └─────────────────────────┘
```

**pgbouncer.ini Configuration**

```ini
[databases]
krewpact = host=10.0.30.10 port=5432 dbname=krewpact

[pgbouncer]
pool_mode = transaction       # Transaction-level pooling for Node.js
listen_port = 6432
listen_addr = 10.0.20.60      # PgBouncer CT IP
max_client_conn = 500
default_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3

# Connection timeout
server_lifetime = 3600
server_idle_timeout = 600

# Query timeout
query_timeout = 0             # Disable (handle in app)
idle_in_transaction_session_timeout = 180000

# Admin
admin_users = postgres
stats_users = monitoring
```

### PostgreSQL Extensions & Features

**Installed Extensions**

| Extension       | Purpose                              | Config                       |
| --------------- | ------------------------------------ | ---------------------------- |
| **uuid-ossp**   | UUID v1/v3/v4 generation             | CREATE EXTENSION uuid-ossp   |
| **pgcrypto**    | Encryption, hashing (bcrypt, SHA256) | CREATE EXTENSION pgcrypto    |
| **pg_trgm**     | Text search, fuzzy matching          | CREATE EXTENSION pg_trgm     |
| **citext**      | Case-insensitive text (emails)       | CREATE EXTENSION citext      |
| **hstore**      | Key-value data type                  | CREATE EXTENSION hstore      |
| **json**        | JSON/JSONB support                   | Built-in (PostgreSQL 9.2+)   |
| **timescaledb** | Time-series data (future)            | CREATE EXTENSION timescaledb |
| **pg_cron**     | Scheduled jobs (backups, cleanup)    | CREATE EXTENSION pg_cron     |

**Schema and Multi-Tenancy**

```sql
-- Tenant schema isolation (Supabase-inspired)
CREATE SCHEMA tenant_001_acme;  -- Tenant 1
CREATE SCHEMA tenant_002_xyz;   -- Tenant 2

-- Row-Level Security (RLS) enabled by default
ALTER TABLE tenant_001_acme.projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own projects
CREATE POLICY tenant_001_rls ON tenant_001_acme.projects
  AS SELECT USING (
    auth.uid() = user_id  -- Magic 'auth' schema from Supabase extension
  );

-- Stored procedures for bulk operations
CREATE OR REPLACE FUNCTION archive_old_projects(days_old INT DEFAULT 90)
RETURNS INT AS $$
  DELETE FROM projects
  WHERE updated_at < NOW() - INTERVAL '1 day' * days_old
  AND status = 'archived'
  RETURNING COUNT(*);
$$ LANGUAGE SQL;
```

### Replication and Streaming Backups

**Physical Replication Setup**

```
Primary (10.0.30.10):
  wal_level = replica
  max_wal_senders = 3
  wal_keep_size = 1GB

Backup Server (10.0.40.10):
  pg_basebackup -h 10.0.30.10 -U postgres -v -P -W \
    -D /var/lib/postgresql/backup/main

Continuous archiving:
  archive_command = 'test ! -f /mnt/backup/wal_archive/%f && cp %p /mnt/backup/wal_archive/%f'
  restore_command = 'cp /mnt/backup/wal_archive/%f %p'
```

**Point-in-Time Recovery (PITR)**

```
Restore to specific timestamp:
  1. Stop PostgreSQL on backup VM
  2. recovery.conf: recovery_target_timeline = 'latest'
  3. Set recovery_target_time = '2025-02-09 14:30:00'
  4. Start PostgreSQL
  5. Verify: SELECT NOW();
  6. Promote standby if permanent: pg_ctl promote
```

### Supabase Services Configuration

**Real-time Subscriptions**

```typescript
// supabase/realtime-config.sql
-- Enable replication for specific tables (reduces overhead)
CREATE PUBLICATION supabase_realtime FOR TABLE
  projects,
  tasks,
  team_updates;

-- Configure Realtime (supabase_realtime extension)
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Client-side subscription
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Listen to INSERT/UPDATE/DELETE on tasks table
const subscription = supabase
  .channel('projects:*')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'projects' },
    (payload) => {
      console.log('New project:', payload.new);
      updateDashboard(payload.new);
    }
  )
  .subscribe();
```

**Storage Configuration**

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('documents', 'documents', false),
  ('avatars', 'avatars', true),
  ('project-attachments', 'project-attachments', false);

-- RLS policy: Users can only see their uploads
CREATE POLICY user_storage ON storage.objects
  AS SELECT USING (
    auth.uid() = owner_id
  );
```

**pg_cron Scheduled Jobs**

```sql
-- Hourly: Archive old audit logs
SELECT cron.schedule('archive-logs', '0 * * * *', $$
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
$$);

-- Daily: Generate backups
SELECT cron.schedule('daily-backup', '0 2 * * *', $$
  SELECT backup_database();
$$);

-- Weekly: Vacuum and analyze
SELECT cron.schedule('maintenance', '0 3 * * 0', $$
  VACUUM ANALYZE;
  REINDEX DATABASE krewpact;
$$);
```

---

## 6. ERPNEXT DEPLOYMENT

### Frappe Bench Architecture

**Directory Structure**

```
/home/frappe/frappe-bench/
├── apps/                          # Application git repositories
│   ├── frappe/                    # Frappe framework core
│   ├── erpnext/                   # ERPNext application
│   └── custom_app/                # Custom business logic app
├── sites/                         # Site data (multi-tenant)
│   ├── site1.local/
│   │   ├── public/                # Uploaded files
│   │   └── private/               # Encrypted attachments
│   └── site2.local/
├── env/                           # Python virtual environment
├── config/                        # Supervisor, Nginx configs
├── logs/                          # Application logs
└── env.sh                         # Environment variables
```

**Frappe Bench Installation**

```bash
# Run as frappe user (UID 1000)
su - frappe

# Bench init (bench tool)
bench init --frappe-branch version-14 frappe-bench
cd frappe-bench

# Install ERPNext
bench get-app erpnext --branch version-14
bench new-site site1.local --admin-password=***

# Install app on site
bench --site site1.local install-app erpnext

# Enable production mode
bench setup production-like

# Start services
bench start
```

### ERPNext VM Configuration

**MariaDB Database**

```yaml
MariaDB Version: 10.6 (LTS)
Default port: 3306
Character set: utf8mb4 (emojis, multilingual)
Collation: utf8mb4_unicode_ci

Configuration (/etc/mysql/mariadb.conf.d/50-server.cnf):
  [mysqld]
  datadir = /var/lib/mysql

  # Memory tuning
  innodb_buffer_pool_size = 16G       # 50% RAM for single DB
  innodb_log_file_size = 512M         # 25% buffer pool
  key_buffer_size = 2G                # MyISAM cache
  query_cache_size = 0                # Disable (Frappe handles caching)

  # Performance
  max_connections = 200
  max_allowed_packet = 256M           # Large attachments
  slow_query_log = 1
  long_query_time = 2                 # Log queries > 2s
  log_queries_not_using_indexes = 1

  # Replication (optional)
  server-id = 1
  log_bin = /var/log/mysql/mariadb-bin
  binlog_format = ROW
  binlog_row_image = MINIMAL
```

**Frappe Configuration (frappe-bench/config/frappe.conf)**

```ini
[Paths]
log_file = /home/frappe/frappe-bench/logs/frappe.log
use_ssl = true
ssl_certfile = /etc/letsencrypt/live/erp.krewpact.io/fullchain.pem
ssl_keyfile = /etc/letsencrypt/live/erp.krewpact.io/privkey.pem

[Security]
db_name = erpnext_site1
db_password = *** (stored in site config)
allow_local_login = 0
allowed_cors_origins = https://krewpact.io
developer_mode = 0

[Performance]
cache_size = 500  # Redis cache entries
session_ttl = 86400  # 24 hour sessions
```

### Worker Processes and Load Balancing

**Supervisor Configuration**

```ini
; /etc/supervisor/conf.d/frappe-bench.conf
[program:frappe-web]
command=/home/frappe/frappe-bench/env/bin/gunicorn \
  --workers 4 \
  --worker-class sync \
  --bind 127.0.0.1:8000 \
  --timeout 120 \
  --access-logfile - \
  frappe.app:application
directory=/home/frappe/frappe-bench
user=frappe
autostart=true
autorestart=true
stdout_logfile=/home/frappe/frappe-bench/logs/web.log

[program:frappe-worker-default]
command=/home/frappe/frappe-bench/env/bin/bench worker \
  --site site1.local \
  --queue default \
  --workers 2
directory=/home/frappe/frappe-bench
user=frappe
autostart=true
autorestart=true
stdout_logfile=/home/frappe/frappe-bench/logs/worker-default.log

[program:frappe-worker-long]
command=/home/frappe/frappe-bench/env/bin/bench worker \
  --site site1.local \
  --queue long \
  --workers 1
directory=/home/frappe/frappe-bench
user=frappe
autostart=true
autorestart=true
stdout_logfile=/home/frappe/frappe-bench/logs/worker-long.log

[program:frappe-schedule]
command=/home/frappe/frappe-bench/env/bin/bench schedule
directory=/home/frappe/frappe-bench
user=frappe
autostart=true
autorestart=true
stdout_logfile=/home/frappe/frappe-bench/logs/scheduler.log

[group:frappe-workers]
programs=frappe-worker-default,frappe-worker-long,frappe-schedule
priority=999
```

### Redis Cache Configuration

**Redis Integration with Frappe**

```python
# frappe-bench/sites/site1.local/site_config.json
{
  "redis_cache": "redis://10.0.20.60:6379/0",
  "redis_queue": "redis://10.0.20.60:6379/1",
  "redis_socketio": "redis://10.0.20.60:6379/2",

  "session_ttl": 86400,
  "auto_email_report": [],
  "file_watcher_timeout": 30,
  "monitor": true,
  "monitoring_config": {"enabled": true}
}
```

**Redis Memory Allocation**

```
Database 0: Cache (frappe.cache)
  - Key-value cache for doctype queries
  - Expiry: 24 hours
  - Eviction: allkeys-lru

Database 1: Queue (RQ Job Queue)
  - Async job processing (reports, exports)
  - Expiry: Job duration + buffer
  - Eviction: noeviction (preserve jobs)

Database 2: SocketIO (real-time updates)
  - Session management, pub/sub
  - Expiry: Session timeout
  - Eviction: volatile-ttl

Total: 16 GB Redis VM allocation (8 GB per DB min)
```

### Nginx Configuration for ERPNext

**Reverse Proxy (Nginx Proxy Manager)**

```nginx
server {
  server_name erp.krewpact.io;
  listen 80;
  return 301 https://$server_name$request_uri;  # Force HTTPS
}

server {
  server_name erp.krewpact.io;
  listen 443 ssl http2;
  ssl_certificate /etc/letsencrypt/live/erp.krewpact.io/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/erp.krewpact.io/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;

  client_max_body_size 50M;
  client_body_timeout 120s;
  client_header_timeout 120s;

  # Upstream to Frappe
  upstream frappe_backend {
    server 127.0.0.1:8000;
    keepalive 32;
  }

  location / {
    proxy_pass http://frappe_backend;
    proxy_http_version 1.1;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Host $http_host;
    proxy_set_header Connection "";
    proxy_redirect off;
    proxy_cache_bypass $http_upgrade;

    # Timeouts for long-running reports
    proxy_connect_timeout 120s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;
  }

  # Socket.io for real-time updates
  location /socket.io {
    proxy_pass http://127.0.0.1:9000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Static assets (caching)
  location ~* ^/assets/ {
    expires 365d;
    add_header Cache-Control "public, immutable";
  }

  # Deny access to private files
  location ^~ /private/ {
    return 403;
  }
}
```

### ERPNext Modules and Customization

**Installed Modules**

| Module            | Purpose                              | Custom Workflows                    |
| ----------------- | ------------------------------------ | ----------------------------------- |
| **Accounts**      | Invoicing, journals, tax             | AP/AR aging, multi-currency         |
| **Selling**       | Quotes, sales orders, shipments      | Approval routing, discount rules    |
| **Buying**        | Purchase orders, supplier management | RFQ automation, vendor scoring      |
| **Inventory**     | Stock, warehouses, transfers         | Bin management, reorder levels      |
| **HR**            | Payroll, leave, attendance           | Custom org chart, training tracking |
| **CRM**           | Leads, opportunities, cases          | Pipeline management, forecasting    |
| **Manufacturing** | BOM, work orders, quality            | Custom routing, shop floor control  |

**Custom App Integration (custom_app/)**

```python
# custom_app/custom_app/hooks.py
app_name = "custom_app"
app_title = "KrewPact Custom"
app_publisher = "KrewPact Team"
app_description = "Custom workflows, integrations"
app_email = "dev@krewpact.io"
app_version = "1.0.0"

# Doctype hooks
doc_events = {
  "Sales Order": {
    "on_submit": "custom_app.overrides.sales_order.on_submit_so",
    "after_insert": "custom_app.integrations.n8n.trigger_so_workflow",
  },
  "Purchase Order": {
    "before_save": "custom_app.validations.validate_po_limits",
  },
}

# API endpoints
after_migrate = [
  "custom_app.migrate.v1_0_0_setup_webhooks",
]
```

---

## 7. ENVIRONMENT STRATEGY

### Environment Matrix

| Aspect               | Development              | Staging                    | Production            | Disaster Recovery             |
| -------------------- | ------------------------ | -------------------------- | --------------------- | ----------------------------- |
| **Location**         | Proxmox VLAN 50          | Proxmox VLAN 50 (isolated) | Proxmox VLAN 20       | Backup VM VLAN 40             |
| **Database**         | PostgreSQL clone (daily) | PostgreSQL clone (daily)   | PostgreSQL primary    | PostgreSQL from backup        |
| **API Key Scope**    | Development/test         | Staging sandbox            | Production live       | Read-only audit trail         |
| **Data Retention**   | 7 days                   | 30 days                    | Indefinite            | 90 days (archived)            |
| **SSL Certs**        | Self-signed              | Let's Encrypt staging      | Let's Encrypt prod    | Inherited from prod           |
| **Backup Frequency** | None                     | Daily @ 2am                | Hourly                | Every 6 hours (tested weekly) |
| **User Access**      | Unrestricted             | Engineering team only      | Role-based (RBAC)     | SRE + Founder only            |
| **Feature Flags**    | All enabled              | Selected features          | Canary rollout        | Feature parity with prod      |
| **Monitoring**       | Basic logs               | Prometheus + Grafana       | Full alerting         | Read-only dashboards          |
| **Deploy Frequency** | Ad-hoc (multiple/day)    | On PR merge to staging     | Weekly release window | Manual (incident response)    |
| **Scaling**          | Manual                   | Manual                     | Auto-scaling rules    | Fixed (manual recovery)       |

### Environment Parity and Sync

**Data Synchronization Pipeline**

```
Production DB (Primary)
    ↓ (daily ZFS snapshot)
PostgreSQL Backup VM
    ↓ (refresh @ 3am UTC)
Staging PostgreSQL Clone
    ↓ (refresh @ 3:30am UTC)
Development PostgreSQL Clone

REFRESH PROCEDURE:
1. ZFS snapshot: tank/vm/supabase@daily-2025-02-09
2. Backup server: pg_basebackup from snapshot
3. Staging: psql -h staging.local -c 'DROP DATABASE staging_clone;'
4. Staging: pg_restore from backup dump (compressed)
5. Dev: Same process (post-staging validation)
6. Verify: Run integration tests, check record counts
7. Log: Record snapshot timestamp, row counts per table
```

**Docker Compose for Dev/Staging**

```yaml
# dev-staging/docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: krewpact
      POSTGRES_USER: krewpact_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U krewpact_user']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  api:
    build:
      context: ../backend
      dockerfile: Dockerfile.dev
    environment:
      NODE_ENV: ${NODE_ENV}
      DATABASE_URL: postgres://krewpact_user:${DB_PASSWORD}@postgres:5432/krewpact
      REDIS_URL: redis://redis:6379
      API_PORT: 3000
      LOG_LEVEL: debug
    ports:
      - '3000:3000'
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ../backend:/app
      - /app/node_modules

  next-frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile.dev
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000
      NEXT_PUBLIC_SUPABASE_URL: http://localhost:5432
    ports:
      - '3001:3000'
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### Configuration Management

**Environment Variable Strategy**

```
Hierarchy (precedence):
1. .env.local (local overrides, gitignored)
2. .env.{environment} (.env.production, .env.staging)
3. .env (shared defaults)
4. system env vars (Docker secrets, Kubernetes ConfigMaps)

File Layout:
krewpact-web/.env                    # Public defaults
krewpact-web/.env.production        # Production-specific (NEVER secrets)
krewpact-web/.env.staging           # Staging overrides
krewpact-web/.env.local             # Developer local (gitignored)

krewpact-api/.env.example           # Template for contributors
krewpact-api/config/
  ├── dev.json
  ├── staging.json
  └── prod.json

Secrets Management:
  - Production API keys: Stored in Vercel Secrets CLI
  - Database passwords: Stored in Proxmox vault (/root/.secrets/)
  - OAuth tokens: Stored in 1Password, rotated quarterly
```

**Docker Secrets Example**

```bash
# Create Docker secrets (Swarm mode or Kubernetes)
echo "postgres_password_prod_123" | docker secret create db_password -
echo "api_key_sk_live_xxxxx" | docker secret create stripe_secret -

# Reference in docker-compose.yml
services:
  postgres:
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
```

### Feature Flags and Gradual Rollout

**LaunchDarkly Integration (or self-hosted flag server)**

```typescript
// lib/flags.ts
import { initialize } from 'launchdarkly-js-sdk';

const ldClient = initialize('sdk-key-production', {
  key: userId,
  email: userEmail,
  custom: {
    plan: subscription.plan,
    teamSize: team.members.length,
  },
});

// Usage in components
export function BetaFeature() {
  const showBeta = ldClient.variation('new-dashboard-beta', false);

  return showBeta ? <NewDashboard /> : <LegacyDashboard />;
}
```

**Flag Management Matrix**

| Flag Name              | Dev  | Staging | Production | Rollout %   | Tied to Plan      |
| ---------------------- | ---- | ------- | ---------- | ----------- | ----------------- |
| **new-dashboard**      | true | true    | false      | 0% (canary) | Enterprise        |
| **advanced-analytics** | true | true    | true       | 100%        | Pro+              |
| **bulk-export**        | true | true    | true       | 100%        | All               |
| **gpu-rendering**      | true | false   | false      | 0%          | Enterprise (beta) |
| **ai-estimator**       | true | true    | false      | 0%          | Coming soon       |

---

## 8. BACKUP AND DISASTER RECOVERY

### 3-2-1 Backup Rule Implementation

**Backup Locations**

```
KrewPact Data (Production Proxmox)
    │
    ├─ Copy 1: ZFS snapshots (on same pool) [LOCAL SSD]
    │  └─ Retention: 24 hourly + 7 daily + 4 weekly
    │
    ├─ Copy 2a: Backup VM (VLAN 40) [LOCAL HDD]
    │  └─ Retention: 30 daily + 12 monthly
    │
    ├─ Copy 2b: USB drive (external, encrypted) [PHYSICAL]
    │  └─ Retention: Monthly snapshots, rotated weekly
    │
    └─ Copy 3: Cloud archive (AWS S3 Glacier) [OFFSITE]
       └─ Retention: 7 years (compliance), quarterly upload

Backup Strategy:
- Media: 3 (SSD snapshots, HDD backups, S3 archive)
- Geography: 2 (on-site, off-site)
- Sites: 2 (hot: ZFS, cold: Backup VM + Cloud)
```

### Backup Schedule Per Component

| Component            | Type                     | Frequency                   | Tool                   | Retention | Verify Method              |
| -------------------- | ------------------------ | --------------------------- | ---------------------- | --------- | -------------------------- |
| **PostgreSQL**       | Full + Incremental       | Hourly snapshot, daily dump | pg_dump + ZFS send     | 30 days   | pg_restore test query      |
| **ERPNext DB**       | Full + Incremental       | Daily @ 2am                 | mysqldump (compressed) | 30 days   | ERPNext data import test   |
| **Supabase Storage** | Rsync                    | Daily @ 4am                 | rsync -av --delete     | 30 days   | File count/checksum verify |
| **Nginx configs**    | Tar archive              | Weekly                      | tar.gz                 | 52 weeks  | Config validation test     |
| **Monitoring data**  | Prometheus snapshots     | Daily                       | snapshot + upload      | 30 days   | Query metric replay        |
| **Redis cache**      | RDB dump                 | Daily @ 1am                 | BGSAVE                 | 7 days    | AOF reconstruction test    |
| **n8n workflows**    | Database + config export | Daily                       | n8n export CLI         | 365 days  | Workflow import test       |
| **ZFS pools**        | Snapshot replicate       | Hourly                      | zfs send/recv          | See above | Snapshot diff verification |

**Backup Execution Script (/usr/local/bin/backup-all.sh)**

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/mnt/backup"
LOG_FILE="/var/log/backup/backup-$(date +%Y%m%d).log"
ALERT_EMAIL="ops@krewpact.io"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
error() { log "ERROR: $*"; echo "$*" | mail -s "Backup Failed" "$ALERT_EMAIL"; exit 1; }

# PostgreSQL backup
log "Starting PostgreSQL backup..."
pg_dump -h 10.0.30.10 -U postgres krewpact \
  | gzip > "$BACKUP_DIR/postgres_$(date +%Y%m%d_%H%M%S).sql.gz" \
  || error "PostgreSQL backup failed"

# Verify backup
if gunzip -t "$BACKUP_DIR"/postgres_*.sql.gz &>/dev/null; then
  log "PostgreSQL backup verified"
else
  error "PostgreSQL backup corruption detected"
fi

# MySQL/MariaDB backup (ERPNext)
log "Starting ERPNext database backup..."
mysqldump -u root -p"$DB_ROOT_PASSWORD" --all-databases \
  | gzip > "$BACKUP_DIR/erpnext_$(date +%Y%m%d_%H%M%S).sql.gz" \
  || error "ERPNext backup failed"

# ZFS snapshots
log "Creating ZFS snapshots..."
for dataset in tank/vm/supabase tank/vm/erpnext tank/ct/*; do
  zfs snapshot "$dataset@backup-$(date +%Y%m%d_%H%M%S)" || error "ZFS snapshot of $dataset failed"
done

# Send to Backup VM (10.0.40.10)
log "Syncing to Backup VM..."
rsync -av --delete "$BACKUP_DIR/" \
  backup_user@10.0.40.10:/mnt/backups/ \
  || error "Backup VM sync failed"

# Send to Cloud (quarterly)
if [[ $(date +%m) =~ ^(01|04|07|10)$ ]]; then
  log "Starting cloud archive (quarterly)..."
  aws s3 sync "$BACKUP_DIR/" s3://krewpact-backups-archive/$(date +%Y-%m)/ \
    --storage-class GLACIER --sse AES256 \
    || error "Cloud archive failed"
fi

log "All backups completed successfully"
```

### RPO/RTO Targets

| Component                      | RPO      | RTO        | Recovery Procedure                            |
| ------------------------------ | -------- | ---------- | --------------------------------------------- |
| **PostgreSQL (primary)**       | 1 hour   | 5 minutes  | Restore from ZFS snapshot on standby          |
| **PostgreSQL (full recovery)** | 24 hours | 30 minutes | pg_restore from daily dump                    |
| **ERPNext VM**                 | 6 hours  | 20 minutes | Proxmox: VM backup restore + MariaDB recovery |
| **Redis cache**                | 1 hour   | 2 minutes  | Restart from RDB dump (empty OK)              |
| **Frontend (Vercel)**          | N/A      | ~5 minutes | Rollback deployment via Vercel dashboard      |
| **Nginx reverse proxy**        | 1 hour   | 10 minutes | Restore config from tar + restart container   |
| **Full site disaster**         | 24 hours | 2 hours    | Restore from offsite backup, rebuild Proxmox  |

### Recovery Runbooks

**Runbook: PostgreSQL Data Corruption Recovery**

```markdown
## Scenario

- PostgreSQL reports corruption (e.g., "invalid page in block")
- Queries fail with: ERROR: invalid page in relation

## Detection

pg_dump krewpact > /tmp/dump.sql 2>&1 # Will fail with corruption message

## Recovery Steps

1. Identify corrupted table:
   - Check PostgreSQL logs: /var/log/postgresql/postgresql.log
   - Search for: "invalid page", "checksum failed"

2. Stop affected application:
   - systemctl stop frappe-bench # Stop ERPNext if affected
   - Stop Node.js API connections

3. Restore from ZFS snapshot (best case):
   - List snapshots: zfs list -t snapshot
   - Restore latest clean: zfs rollback tank/vm/supabase@hourly-2025-02-09T13:00:00Z
   - Verify: psql -c "SELECT COUNT(\*) FROM affected_table;"
   - Restart PostgreSQL: systemctl restart postgresql

4. If ZFS rollback loses data:
   - Restore from backup VM (pg_restore): ~15 min recovery
   - Data loss: up to 1 hour

5. Validate application:
   - Check ERPNext startup: frappe@site1.local> bench start
   - Run integration tests: npm test
   - Monitor: Check Grafana for error rates (should be 0)

6. Alert: Notify team of incident + RCA in Slack

## Prevention

- Enable PostgreSQL checksums: ALTER SYSTEM SET data_checksums = on;
- Monitor disk health: smartctl -H /dev/nvme0n1
- Regular verification: pg_verify_checksums -D /var/lib/postgresql/14/main
```

**Runbook: Proxmox Node Failure**

```markdown
## Scenario

- Proxmox host crashes (hardware failure, kernel panic)
- VMs are down: PostgreSQL, ERPNext, Redis, all services

## Detection

- Monitoring alert: "Proxmox host unreachable"
- Check IPMI console for errors

## Recovery Steps (Single Node → Multi-Node Migration)

### Immediate (< 5 min)

1. Power on backup Proxmox host (if available, pre-configured clone)
2. Restore from Backup VM:
   - Backup Server (10.0.40.10) has daily VM backups
   - Procedure: Proxmox → Backup Server → New Host

### Step-by-Step (30-120 min)

1. Boot backup Proxmox from ISO (same ZFS config as primary)
2. Import ZFS pool: zpool import tank
3. Start critical VMs in order:
   - PostgreSQL first: qm start 100 (VM ID)
   - Wait for port 5432: nc -zv 10.0.30.10 5432
   - Redis: qm start 101
   - Node API: qm start 102
   - Nginx: qm start 103
4. Verify services:
   - psql -h 10.0.30.10 -c "SELECT VERSION();"
   - curl -I https://api.krewpact.io
5. Restore DNS: Update Cloudflare A record to new Proxmox IP (if changed)
6. Notify stakeholders: "Service restored, investigating root cause"

### Post-Recovery (RCA)

- Identify hardware failure (HDD, NVMe, PSU)
- Replace component, reinstall OS
- Resync ZFS pool: zfs send/recv tank from backup
- Resume as secondary in cluster (future HA setup)
```

**Runbook: Data Loss Incident (Ransomware/Accidental Delete)**

```markdown
## Scenario

- Ransomware or bad deployment deletes/corrupts production DB
- All snapshots also compromised (encrypted)
- Last clean backup: 24 hours ago

## Detection

- Monitoring alert: "Critical data missing"
- Team notifies: "Data looks wrong"

## Recovery Steps

1. **Immediate containment:**
   - Isolate Proxmox from network: unplug physical NIC
   - Stop all services: systemctl stop frappe-bench, node-api
   - Preserve logs for forensics: /var/log/\* to external drive

2. **Assess data integrity:**
   - Backup Server (10.0.40.10): Check last daily backup timestamp
   - Cloud archive (S3 Glacier): Can retrieve within 24-48 hours

3. **Restore from Backup VM:**
   - Backup Server is on VLAN 40 (isolated), less likely compromised
   - pg_restore from daily_2025-02-08.sql.gz
   - Expected data loss: < 24 hours of transactions

4. **Data reconciliation:**
   - Compare restored DB row counts vs. application metrics
   - Check audit logs (Sentry, PostgreSQL logs) for suspicious activity
   - Cross-reference with external sources (email records, API logs)

5. **Rebuild production:**
   - Provision new PostgreSQL VM (clean)
   - pg_restore verified backup
   - Validate checksums: pg_verify_checksums
   - Start application services one by one

6. **Incident response:**
   - Alert all users: "Service restored, investigating incident"
   - Begin forensics: Review logs for compromised credentials
   - Rotate all secrets: API keys, DB passwords
   - Implement additional security: EDR on Proxmox host, file integrity monitoring

## Prevention

- Air-gapped backup (Backup VM isolated by default)
- Immutable backups (S3 Object Lock for archive)
- Backup testing: Monthly restore-and-verify exercise
- Monitoring: File integrity changes (AIDE, osquery)
- Access control: Backup Server read-only for production user
```

---

## 9. SCALING STRATEGY

### Scaling Philosophy: Vertical Then Horizontal

**Stage 1: Single-Node Optimization (0-300 users)**

- Current state (KrewPact today)
- Scale vertically: CPU, RAM, storage
- Focus: Optimize queries, cache layer, DB tuning
- Effort: Configuration + monitoring
- Cost: Hardware investment (one-time)

**Stage 2: Horizontal Foundation (300-500 users)**

- Add second Proxmox node
- Database replication (PostgreSQL → Standby)
- Load balancing: Nginx upstream pools
- Container orchestration: Docker Swarm or Kubernetes planning
- Cost: Second host + network infrastructure

**Stage 3: Full Cluster (500-1000+ users)**

- Kubernetes deployment (k3s lightweight option)
- Database sharding (if needed)
- Multi-region replication (future)
- Serverless functions (Cloudflare Workers)
- Cost: Ongoing cloud/cloud-hybrid investment

### Capacity Planning Projections

**User Growth Assumptions**

```
Month 1: 50 users
Month 6: 150 users
Month 12: 300 users
Year 2: 500-600 users
Year 3: 1000+ users

Baseline per-user metrics:
- Storage: 100 MB/user (projects, files, historical data)
- Connection pool: 1-2 concurrent DB connections
- Memory per container: 10-20 MB (shared via page cache)
- Request rate: 10 req/min/user (peak: 50 req/min/user)
```

**Database Capacity Projections**

| Users    | Transactions/day | Table size | RAM needed | vCPU | RTO    |
| -------- | ---------------- | ---------- | ---------- | ---- | ------ |
| **100**  | 10K              | 2 GB       | 16 GB      | 4    | 5 min  |
| **300**  | 50K              | 10 GB      | 32 GB      | 8    | 10 min |
| **500**  | 100K             | 20 GB      | 48 GB      | 12   | 15 min |
| **1000** | 200K             | 40 GB      | 64 GB      | 16   | 20 min |
| **2000** | 500K             | 100 GB     | 128 GB     | 24   | 30 min |

**Action triggers:**

```
If active connections > 150: Upgrade shared_buffers (add RAM)
If query response time > 1s: Add read replicas, optimize slow queries
If storage growth > 20 GB/month: Plan horizontal scaling
If CPU utilization > 70% sustained: Upgrade vCPU or distribute load
```

### Storage Scaling Strategy

**Current (300 users): 500 GB SSD**

```
Projects table:       50 GB
Tasks/subtasks:       30 GB
Attachments/files:    200 GB
Audit logs:           100 GB
Indexes:              100 GB
Overhead:             20 GB
```

**Stage 2 (500 users): 1 TB SSD + Tiered Archive**

```
Hot tier (SSD):
  - Current month data
  - Active project data
  - Size: 500 GB

Warm tier (HDD):
  - 1-6 months old
  - Indexed but not hot
  - Size: 1 TB

Cold tier (S3 Glacier):
  - 6+ months old
  - Archive-only (restores take 4-24 hours)
  - Size: Unlimited (cost-effective)

Automated archival:
  - PostgreSQL partitioning by date
  - pg_cron job: Monthly move to archive
  - Restore procedure: AWS CLI copy from Glacier
```

### Network and Bandwidth Scaling

**Current (Single Node): Single 1GbE link sufficient**

```
Peak throughput estimate: 200 Mbps
  - API request/response: ~100 Mbps
  - File downloads: ~80 Mbps
  - Backup replication: ~20 Mbps (off-peak)

Headroom: 5x (1000 Mbps link utilization target)
Action trigger: Scale when > 200 Mbps sustained
```

**Stage 2 (Dual Node): 10GbE between nodes + 1GbE to WAN**

```
Inter-node communication:
  - Database replication: 500 Mbps peak
  - Container synchronization: 100 Mbps
  - Storage replication: 200 Mbps

Topology:
  Node1 ←→ [10GbE switch] ←→ Node2
  └─ Dual 1GbE to ISP/WAN per node
  └─ Redundancy: Failover if one link down
```

### API and Frontend Scaling

**Node.js API Horizontal Scaling**

| Stage           | Instances | CPU         | RAM       | Connections | RPS (requests/sec) |
| --------------- | --------- | ----------- | --------- | ----------- | ------------------ |
| **0-300 users** | 1         | 4 vCPU      | 8 GB      | 100         | 500                |
| **300-500**     | 2         | 4 vCPU x2   | 8 GB x2   | 200         | 1000               |
| **500-1000**    | 4         | 4 vCPU x4   | 8 GB x4   | 400         | 2000               |
| **1000+**       | 8+ (K8s)  | 2-4 vCPU ea | 4-8 GB ea | 800+        | 4000+              |

**Load Balancing (Nginx Proxy Manager)**

```nginx
upstream api_backend {
  least_conn;  # Load balance by active connection count

  server api1.internal:3000 weight=1;
  server api2.internal:3000 weight=1;
  server api3.internal:3000 weight=1 backup;  # Failover

  keepalive 32;
  keepalive_timeout 60s;
}

server {
  location /api/ {
    proxy_pass http://api_backend;
    proxy_connect_timeout 5s;
    proxy_read_timeout 30s;
    proxy_next_upstream error timeout http_503 http_504;
    proxy_next_upstream_tries 2;
  }
}
```

**Vercel Frontend Auto-Scaling (Already Handled)**

```
- Vercel scales automatically based on traffic
- No configuration needed
- Pricing: $150 + variable cost/GB transferred
- Edge functions: Automatic geographic distribution
- At 1000+ users: Monitor CDN costs, consider self-hosted reverse proxy
```

### Monitoring and Auto-Scaling Triggers

**Prometheus Rules (Alerting)**

```yaml
groups:
  - name: scaling_rules
    rules:
      # Database CPU high
      - alert: PostgresHighCPU
        expr: 'node_cpu_seconds_total{instance="10.0.30.10"} > 0.7'
        for: 5m
        labels:
          action: scale_db_vcpu

      # API container memory pressure
      - alert: NodeAPIHighMemory
        expr: 'container_memory_usage_bytes{name="api"} / container_spec_memory_limit_bytes > 0.8'
        for: 3m
        labels:
          action: add_api_instance

      # Redis eviction rate
      - alert: RedisEvictions
        expr: 'redis_evicted_keys_total > 1000'
        for: 2m
        labels:
          action: scale_redis_memory

      # Network saturation
      - alert: EgressBandwidthHigh
        expr: 'rate(node_network_transmit_bytes_total{device="eth0"}[5m]) > 900000000' # 900 Mbps
        for: 5m
        labels:
          action: add_network_link

      # Storage capacity
      - alert: StorageNearFull
        expr: '(node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15'
        for: 10m
        labels:
          action: archive_old_data
```

**Auto-Scaling Policy (Manual Triggers for Now, Kubernetes-Ready)**

```bash
# When alert fires, operator reviews and triggers:

# Add API container
docker run -d --name api-3 --net=production --ip=10.0.20.53 \
  -e DATABASE_URL=postgres://... api:latest

# Update Nginx upstream
nginx -t && nginx -s reload

# Monitor new instance
curl -I http://api-3.internal:3000/health
```

---

## 10. RESOURCE REQUIREMENTS

### Minimum Hardware Specifications

**Proxmox Host (Single-Node, 300 users)**

| Component           | Minimum     | Recommended        | Rationale                                                  |
| ------------------- | ----------- | ------------------ | ---------------------------------------------------------- |
| **CPU**             | 8 cores     | 16 cores           | Overhead: Proxmox (2 cores) + VMs (6-12 cores) + buffering |
| **RAM**             | 64 GB       | 128 GB             | 32 GB PostgreSQL + 8 GB ERPNext + 4 GB containers + OS     |
| **Storage Boot**    | 100 GB NVMe | 500 GB NVMe RAID-1 | OS + container images + snapshots                          |
| **Storage Data**    | 1 TB SSD    | 2 TB RAID-1 NVMe   | User data, backups, snapshots (growth buffer)              |
| **Storage Archive** | 2 TB HDD    | 4 TB HDD RAID-6    | Cold storage tier, backups                                 |
| **Network**         | 1x 1GbE     | 2x 1GbE            | Primary + failover link                                    |
| **Memory Speed**    | DDR4-3200   | DDR4-3600          | Lower latency for database                                 |
| **Power Supply**    | 750W        | 1000W              | Headroom for upgrades                                      |
| **Redundancy**      | None        | UPS + 8hr battery  | Graceful shutdown on power loss                            |

**Cost Estimate (Single Node)**

```
CPU: Xeon E-2388G (8 core) or AMD EPYC 3251  $400-800
RAM: 128 GB DDR4 (8x16GB)                     $800-1200
NVMe SSD 500GB (RAID-1)                       $400-600
NVMe SSD 2TB (RAID-1)                         $800-1200
HDD 4TB RAID-6 (4x4TB)                        $400-600
Motherboard + Chassis                          $500-1000
Network Cards (2x 1GbE)                        $100-200
Power Supply + UPS                             $300-500
Miscellaneous (fans, cables)                  $100-200
──────────────────────────────────────────────────────
Total Single-Node Hardware                    $3800-6400
```

**Proxmox Host (Dual-Node Cluster, 500-1000 users)**

| Component                     | Quantity  | Specification                           | Cost        |
| ----------------------------- | --------- | --------------------------------------- | ----------- |
| **Proxmox Nodes**             | 2         | 16 core, 256 GB RAM, 5 TB SSD, 8 TB HDD | $8000-12000 |
| **Network Switch**            | 1         | TP-Link OC200 + ER605 + SG2008P         | $800-1200   |
| **Network Links**             | 4         | 10GbE cluster, 1GbE x2 WAN failover     | $1000-2000  |
| **Storage Expansion**         | As needed | Additional NVMe/HDD                     | Variable    |
| **Shared Storage** (optional) | 1         | NAS or SAN device                       | $2000-5000  |

### Cloud Service Monthly Cost Estimates (Comparison)

**KrewPact on Vercel + Self-Hosted Backend (Recommended)**

| Service                      | Usage                 | Monthly Cost  | Notes                          |
| ---------------------------- | --------------------- | ------------- | ------------------------------ |
| **Vercel (Frontend)**        | 1M monthly visits     | $150-300      | Includes 100 GB bandwidth      |
| **Bandwidth (CDN)**          | 500 GB/month overages | $0-50         | Beyond Vercel's included quota |
| **Proxmox Hardware**         | Amortized 3-year      | ~$150-200     | Hosting cost spread            |
| **DNS (Cloudflare)**         | Free tier             | $0            | 1 domain, basic DNS            |
| **Let's Encrypt Certs**      | Automatic renewal     | $0            | Free public CA                 |
| **Backups (AWS S3)**         | 1 TB archive storage  | $15-30        | Quarterly uploads              |
| **Monitoring (self-hosted)** | Prometheus + Grafana  | $0            | On-prem, no SaaS               |
| **Domain registration**      | 1 year                | $12           | Annual only                    |
| **Email forwarding**         | Via external service  | $25-50        | SendGrid or equivalent         |
|                              |                       |               |
| **Total Monthly**            |                       | **~$350-700** | At 300-500 users               |

**vs. Fully-Cloud Alternative**

| Service                         | Monthly Cost    | Notes                            |
| ------------------------------- | --------------- | -------------------------------- |
| **Supabase Cloud**              | $2000-5000      | PostgreSQL + Real-time + Storage |
| **Vercel**                      | $200-500        | Frontend                         |
| **ERPNext Cloud (ERPNext.com)** | $1500-3000      | Hosted ERP                       |
| **AWS RDS (backup)**            | $500-1000       | Replication, snapshots           |
| **Monitoring (DataDog)**        | $300-1000       | APM + Logs                       |
| **CDN (CloudFlare Pro)**        | $200            | Optional                         |
|                                 |                 |
| **Total Monthly**               | **$4700-10500** | Same scale, fully outsourced     |

**Savings with Self-Hosted Model**

```
Monthly savings: $4700-10500 (cloud) - $350-700 (self-hosted) = $4000-9800/month

Break-even hardware investment:
- $4000/month × 36 months = $144,000 (hardware cost recoups in 3 years)
- Hardware cost: $4000-6000 (single node), $8000-12000 (dual node)
- Payback period: 1-1.5 months (exceptional)

Risk: Founder operational overhead (backup, updates, security patches)
Mitigation: Automated monitoring, runbooks, Tailscale remote access
```

### Infrastructure Checklist for Deployment

**Pre-Production Setup**

- [ ] Proxmox 8.x installed, ZFS pools configured
- [ ] VLANs 1, 10, 20, 30, 40, 50 tagged on TP-Link Omada
- [ ] ER605 gateway DHCP configured per VLAN
- [ ] OC200 controller configured, APs joined
- [ ] PostgreSQL VM created, pg_hba.conf secured
- [ ] ERPNext VM created, MariaDB initialized
- [ ] PgBouncer connection pool running
- [ ] Redis CT running, memory allocation confirmed
- [ ] Nginx Proxy Manager CT running, reverse proxy configured
- [ ] Backup script tested, backup VM receiving backups
- [ ] Monitoring (Prometheus + Grafana) deployed
- [ ] n8n CT running, workflows configured
- [ ] Tailscale enabled, ACL policies set
- [ ] Let's Encrypt certificates auto-renewal working
- [ ] Vercel frontend deployed, API endpoints configured
- [ ] DNS records (Cloudflare) pointing correctly
- [ ] Firewall rules enforced, security tested
- [ ] Disaster recovery runbooks documented, tested
- [ ] Team trained on monitoring dashboards
- [ ] On-call rotation established
- [ ] RCA process documented

---

## APPENDIX: Quick Reference

### Service Port Mapping

```
VLAN 1 (Management):
  10.0.1.1:22    - Proxmox host SSH
  10.0.1.10:8006 - Proxmox Web UI
  10.0.1.50:53   - Dnsmasq DNS

VLAN 10 (DMZ):
  10.0.10.10:80   - Nginx HTTP redirect
  10.0.10.10:443  - Nginx HTTPS (reverse proxy)
  10.0.10.10:9000 - Socket.io forwarding

VLAN 20 (Production):
  10.0.20.50:3000 - Node.js API
  10.0.20.51:8080 - ERPNext Web
  10.0.20.60:6379 - Redis
  10.0.20.70:5000 - n8n API
  10.0.20.80:3000 - Monitoring Grafana

VLAN 30 (Database):
  10.0.30.10:5432 - PostgreSQL primary
  10.0.30.10:6432 - PgBouncer connection pool

VLAN 40 (Backup):
  10.0.40.10:22   - Backup server SSH
  10.0.40.10:9100 - Node Exporter metrics

VLAN 50 (Development):
  10.0.50.10:5432 - PostgreSQL staging clone
  10.0.50.20:6379 - Redis dev
```

### Key Command Reference

```bash
# Proxmox - List VMs
qm list

# Proxmox - Start VM
qm start 100

# ZFS - List snapshots
zfs list -t snapshot

# PostgreSQL - Connect
psql -h 10.0.30.10 -U postgres -d krewpact

# Docker - Monitor containers
docker ps -a && docker stats

# Nginx - Reload config
nginx -t && systemctl reload nginx

# Backup - Run manually
/usr/local/bin/backup-all.sh

# Monitoring - Check Prometheus
curl http://10.0.20.80:9090/api/v1/query?query=up

# Tailscale - Status
tailscale status
```

### Emergency Contacts & Escalation

```
Founder/SRE: [name] - Slack, email, phone
Infrastructure Team: #ops-infrastructure
On-Call: Rotation in PagerDuty/Opsgenie
Upstream ISP Support: [ISP contact + ticket system]
AWS/Cloudflare Support: [Account manager contacts]
```

---

**Document Version**: 1.0
**Last Updated**: 2025-02-09
**Next Review**: 2025-03-09 (monthly)
**Status**: Production-Ready
