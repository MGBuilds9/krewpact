# KrewPact: Comprehensive Cost and Vendor Analysis

**Organization:** MDM Group
**Location:** Mississauga, Ontario, Canada
**Internal Users:** 300+ (scaling to 500-1,000)
**External Portal Users:** 200-500 (clients and trade partners)
**Document Focus:** Cost analysis, vendor pricing, budget projections

---

## 1. EXECUTIVE COST SUMMARY

### Monthly and Annual Cost Overview

| Cost Category | Monthly (300 Users) | Annual (300 Users) | Monthly (500 Users) | Annual (500 Users) |
|---|---|---|---|---|
| **SaaS & Vendor Costs** | $2,945 | $35,340 | $3,625 | $43,500 |
| **Infrastructure** | $500 | $6,000 | $500 | $6,000 |
| **Development Team** | $12,000-25,000 | $144,000-300,000 | $12,000-25,000 | $144,000-300,000 |
| **Operational (Legal, Security, etc.)** | $0 | $28,000-45,000 (Year 1 only) | $0 | $28,000-45,000 (Year 1 only) |
| **TOTAL MONTHLY (SaaS + Infra)** | **$3,445** | **$41,340** | **$4,125** | **$49,500** |
| **TOTAL WITH DEVELOPMENT (Year 1)** | **$15,445-27,445** | **$213,340-329,340** | **$16,125-28,125** | **$221,500-337,500** |

**Key Insight:** Core platform operations (SaaS + infrastructure) cost $3,445-4,125/month regardless of team size. Development costs are the primary variable, ranging from $144K-$300K annually depending on team composition. For a founder-led solo development approach with AI tools, Year 1 costs are approximately $250K-$350K CAD. Subsequent years drop to $180K-$230K if operating with a small in-house team.

---

## 2. SAAS AND VENDOR COSTS

### 2.1 Detailed Vendor Pricing

#### **Supabase (Database + Storage + Realtime)**

**Tier Breakdown:**

| Tier | Monthly Cost | Database | Storage | Bandwidth | Monthly Active Users | Best For |
|---|---|---|---|---|---|---|
| Free | $0 | 500 MB | 1 GB | 2 GB | 100 | Development/Testing |
| Pro | $25 + usage | 8 GB | 100 GB | 100 GB | Unlimited | 100-1,000 users |
| Team | $599 | 100 GB | 500 GB | 1 TB | Unlimited | 1,000+ users |
| Self-Hosted | $0 | Unlimited | Unlimited | Unlimited | Unlimited | On-premises only |

**Cost Analysis for KrewPact:**

For 300 internal users + 500 external portal users (~800 total):
- **Recommended Tier:** Supabase Pro
- **Base Monthly Cost:** $25
- **Usage Projections:**
  - Database growth: 50-80 GB (job records, materials, timesheets) = $50-80 overage
  - Storage overage: 80-120 GB for document scanning/photos = $20-40 overage
  - Bandwidth: 80-150 GB monthly = $80-150 overage
- **Estimated Monthly Cost:** $175-295
- **Annual Cost:** $2,100-$3,540

**Volume Discount Negotiation:** At 500+ users and $200+/month spend, Supabase may offer 10-15% discounts via direct sales.

**Self-Hosted Alternative:** If deployed on existing Proxmox infrastructure:
- Software: $0
- Storage: Minimal (existing hardware)
- Maintenance: 2-4 hours/month = $200-400/month in equivalent labor
- **Annual Cost:** $2,400-4,800

**Recommendation:** Pro tier. Self-hosting adds operational overhead. The $2,100-3,540 annual cost is negligible compared to development costs.

---

#### **Clerk (Authentication)**

**Tier Breakdown:**

| Tier | Monthly Cost | MAU Limit | Organizations | Features | Best For |
|---|---|---|---|---|---|
| Free | $0 | 50,000 | 100 | Basic auth, sessions | <50K users |
| Pro | $0.02 per MAU after 10K | Unlimited | Unlimited | Multi-org, SSO, SAML | 10K-500K+ users |
| Enterprise | Custom | Custom | Custom | Advanced features, SLA | 500K+ users |

**Cost Analysis for KrewPact:**

**Internal Users (300):**
- Monthly Active Users estimate: 250 (80% engagement)
- Cost: Free tier (under 10K MAU)

**External Portal Users (500):**
- Monthly Active Users estimate: 350 (70% engagement)
- Combined MAU: 600

**Total Tier: Free** (for current scale)
- Monthly Cost: $0
- Annual Cost: $0

**Growth Projection (500-1,000 users):**
- Estimated MAU: 1,200-1,800
- If crossing 10K MAU threshold: $0.02 × (MAU - 10,000) = $200-360/month
- Unlikely to reach 10K MAU unless explosive growth

**2026 Pricing Changes (April):** Clerk announced potential price increases for Pro tier usage-based billing. Estimated impact: +20-30% if costs incurred.

**Recommendation:** Free tier. Clerk remains free until 50,000 MAU. Not a cost concern for projected scales.

---

#### **BoldSign (E-Signatures)**

**Tier Breakdown:**

| Tier | Monthly Cost | Document Limit | Signing Links | Branding | Annual Cost |
|---|---|---|---|---|---|
| Starter | $10 | 50 | Basic | None | $120 |
| Business | $25 | Unlimited | Advanced | Full | $300 |
| Enterprise | $50+ | Unlimited | API | Full | $600+ |
| API Add-on | $0.75/doc | Per-document | API-based | Yes | Variable |

**Volume Estimate for KrewPact:**

Typical construction workflow:
- Client acceptance forms: 50-100/month
- RFQ approvals: 75-150/month
- Change order sign-offs: 50-100/month
- Trade partner agreements: 25-50/month
- **Total estimate: 200-400 documents/month**

**Cost Scenarios:**

**Option A: Business Tier Only**
- Monthly: $25
- Annual: $300
- Best if all documents signed through web interface

**Option B: Hybrid (Business Tier + API overages)**
- Business Tier: $25/month
- API documents (300/month × $0.75): $225/month
- Monthly Total: $250
- Annual: $3,000

**Option C: Enterprise Tier**
- Monthly: $50
- Annual: $600
- Includes custom branding, priority support, API

**Recommendation for KrewPact:** Option B (Hybrid) at $250/month ($3,000/year)
- Justification: Heavy e-signature usage in construction. Change orders, RFQs, and trade partner agreements require digital signature compliance. The $225/month API cost is reasonable for compliance and workflow efficiency.

---

#### **Vercel (Frontend Hosting)**

**Tier Breakdown:**

| Tier | Monthly Cost | Deployments | Analytics | Functions | Bandwidth | Best For |
|---|---|---|---|---|---|---|
| Hobby (Free) | $0 | Unlimited | None | 100K/month free | 100 GB/month | Personal projects |
| Pro | $20/user | Unlimited | 6 months | 1M functions/month | 1 TB/month | Teams, commercial |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Unlimited | 500K+ requests/day |

**Cost Analysis for KrewPact:**

**Team Composition (assume 5-10 developers):**

| Metric | Estimate | Notes |
|---|---|---|
| Pro Tier Users | 5-10 | Minimum for team collaboration |
| Monthly Cost | $100-200 | $20 × 5-10 developers |
| Annual Cost | $1,200-2,400 | Includes preview deployments |

**Usage Metrics:**

- Next.js application (KrewPact frontend)
- Estimated monthly deployments: 60-80 (8+ per developer)
- Estimated serverless function invocations: 500K-2M/month
- Estimated bandwidth: 50-150 GB/month
- Cost overages: Minimal (included in Pro tier limits)

**Recommendation:** Pro tier at $20/user/month
- $100-200/month for 5-10 team members
- $1,200-2,400 annual
- Alternative: Self-host on Proxmox with Caddy/Nginx ($0 software, included in infrastructure labor)

---

#### **Tailscale (Networking)**

**Tier Breakdown:**

| Tier | Monthly Cost | Devices | Users | Features | Best For |
|---|---|---|---|---|---|
| Free | $0 | 3 devices | 1 user | Personal VPN, basic | Solo developers |
| Starter | $6/user/month | 100 devices | Unlimited | Teams, ACLs, logs | Small teams |
| Premium | $18/user/month | 100 devices | Unlimited | Advanced security, support | Enterprises |

**Cost Analysis for KrewPact:**

**Estimated Users (Admin/Dev/DevOps):**
- Lead developer: 1
- Backend developers: 1-2
- DevOps/infrastructure: 1
- Optional QA/support access: 1-2
- **Total: 5-7 users**

**Cost at Starter Tier:**
- Monthly: $6 × 5-7 = $30-42
- Annual: $360-504

**Devices per User:**
- Development laptops: 1-2
- VMs for testing: 1-3
- Production Proxmox host: 1
- Mobile access (optional): 1
- **Average: 3-5 devices per user = 15-35 devices total (fits within 100-device limit)**

**Recommendation:** Starter Tier at $30-42/month ($360-504/year)
- Secure remote access to Proxmox and ERPNext
- Team access control lists (ACLs) for production environment
- Replaces expensive VPN infrastructure

---

#### **GitHub (Code Hosting + CI/CD)**

**Tier Breakdown:**

| Tier | Monthly Cost | Users | Private Repos | Actions | Copilot | Best For |
|---|---|---|---|---|---|---|
| Free | $0 | Unlimited | Unlimited | 2,000 min/month | No | Open-source, solo |
| Team | $4/user/month | Per-seat | Unlimited | 3,000 min/month | No | Small teams |
| Enterprise | $21/user/month | Unlimited | Unlimited | Unlimited | Optional | Large orgs |

**Cost Analysis for KrewPact:**

**Team Composition:**
- Developer seats: 5-10
- Recommended tier: Team ($4/user/month)

| Metric | Value |
|---|---|
| Monthly Cost (5 devs) | $20 |
| Monthly Cost (10 devs) | $40 |
| Annual Cost (5 devs) | $240 |
| Annual Cost (10 devs) | $480 |

**Actions Minutes Estimation:**

- CI/CD pipelines per deployment: 10-15 minutes
- Deployments per month: 60-80
- Monthly Actions minutes: 600-1,200
- Free tier allowance: 2,000 minutes/month
- **Expected cost overages: $0** (within free tier)

**GitHub Copilot (Optional Add-on):**
- $10/month individual or $39/month enterprise
- For 5-10 developers: $50-100/month additional
- Synergy with Cursor Pro (below)

**Recommendation:** Team Tier only at $20-40/month ($240-480/year)
- Actions remain free (under 2,000 min/month)
- Private repos, branch protection, code review tools
- Skip Copilot if using Cursor Pro (includes Copilot)

---

#### **Domain and DNS**

**Domain Registration:**

| Provider | Annual Cost | Features | Renewal |
|---|---|---|---|
| Namecheap | $10-15 CAD | WHOIS privacy, auto-renewal | Same |
| Google Domains | $12-18 CAD | Google Workspace integration | Same |
| Cloudflare | $8-15 USD (~$11-20 CAD) | Workers, analytics included | Same |

**Recommendation:** Cloudflare (estimated $180 CAD/year)
- Free DNS with advanced features (DDoS protection, analytics)
- Cloudflare Workers for serverless functions (free tier: 100K requests/day)
- Free SSL certificates included
- Single vendor for domain + DNS + edge services

**Total Domain/DNS Cost:** $180/year CAD

---

#### **Monitoring (Grafana Cloud + Prometheus)**

**Self-Hosted Option:**

| Service | Cost | Notes |
|---|---|---|
| Prometheus | $0 | Open-source, self-hosted on Proxmox |
| Grafana | $0 | Open-source, self-hosted on Proxmox |
| Node Exporter | $0 | Hardware metrics collection |
| PostgreSQL Exporter | $0 | Database metrics |
| **Infrastructure labor** | 5-10 hrs/month setup/maintenance | $250-500/month equivalent |

**Grafana Cloud Option:**

| Tier | Monthly Cost | Metrics | Logs | Best For |
|---|---|---|---|---|
| Free | $0 | 10K metrics | 50 GB/month | Development |
| Pro | $64 | 100K metrics | 100 GB/month | Production |
| Enterprise | Custom | Unlimited | Unlimited | Enterprise |

**Cost Analysis for KrewPact:**

**Recommendation: Self-Hosted (Grafana + Prometheus on Proxmox)**
- Software cost: $0
- Infrastructure: Included in Proxmox (2 vCPU, 4GB RAM container)
- Maintenance effort: 5-10 hours/month = included in DevOps labor
- **Estimated annual cost: $0 direct, $3K-6K in labor**

**Monitoring Stack Breakdown:**
- Prometheus: metrics collection from services
- Grafana: visualization and alerting
- Node Exporter: CPU, memory, disk on Proxmox host
- PostgreSQL Exporter: Supabase metrics (PostgreSQL)
- Alertmanager: Slack/email notifications

**Recommendation:** Self-hosted. Cost-effective and maintains operational control.

---

#### **Email Service (Transactional)**

**Vendor Comparison:**

| Vendor | Free Tier | Pro Tier | Monthly Cost | API Calls/Month | Best For |
|---|---|---|---|---|---|
| Resend | 100 emails/day | $20 (50K/month) | $20 | 50,000 | Developers, simple |
| SendGrid | 100 emails/day | $19.95 (20K/month) | $19.95 | 20,000 | Teams, templates |
| Amazon SES | Free 1st year (50K/day) | $0.10 per 1K | Variable | Pay-as-you-go | High volume |
| Mailgun | 35K/month free | $35-99 | $35+ | 50K+ | Advanced features |

**Volume Estimate for KrewPact:**

| Use Case | Monthly Emails | Notes |
|---|---|---|
| Daily job updates (300 users) | 6,000 | Morning digest |
| Invoice notifications (50/month) | 100 | Client/trade partner |
| Change order approvals (100/month) | 300 | Multi-recipient |
| Timesheet reminders (300 users) | 3,000 | Weekly |
| System alerts and errors | 500 | Weekly logs |
| **Total estimate** | **~10,000** | Conservative |

**Cost Analysis:**

**Option A: Resend Free Tier**
- Monthly limit: 3,000 (100/day × 30)
- **Not sufficient** (exceeds 10,000/month estimate)

**Option B: Resend Pro**
- Monthly cost: $20
- Limit: 50,000 emails/month
- Annual: $240
- Surplus capacity for growth

**Option C: Amazon SES (Pay-as-you-go)**
- First year: Free (50,000 emails/day)
- After 1st year: $0.10 per 1,000 = $1/month for 10,000 emails
- Annual (Year 1): $0, (Year 2+): $12

**Recommendation:** Resend Pro at $20/month ($240/year)
- Simple API integration with Next.js
- Developer-friendly
- Scales to 50K emails/month without additional cost

---

### 2.2 Vendor Cost Summary Table

| Vendor | Tier Selected | Monthly Cost | Annual Cost | Scaling Notes |
|---|---|---|---|---|
| Supabase | Pro | $175-295 | $2,100-3,540 | Usage-based overage |
| Clerk | Free | $0 | $0 | Free until 50K MAU |
| BoldSign | Hybrid (Business + API) | $250 | $3,000 | $0.75/doc API |
| Vercel | Pro (5-10 users) | $100-200 | $1,200-2,400 | $20/user/month |
| Tailscale | Starter (5-7 users) | $30-42 | $360-504 | $6/user/month |
| GitHub | Team (5-10 users) | $20-40 | $240-480 | $4/user/month |
| Domain & DNS | Cloudflare | $15 | $180 | Flat annual |
| Monitoring | Self-hosted | $0 | $0 | Labor included |
| Email | Resend Pro | $20 | $240 | Flat $20/month |
| **TOTAL SaaS COSTS** | **—** | **$610-1,042** | **$7,320-12,504** | **Per month/year** |

**Note:** This table assumes 300-500 internal users and 200-500 external portal users. Costs remain relatively flat across this user range due to tier-based pricing ceilings.

---

### 2.3 Cost Scaling Projections

| Vendor | 300 Users | 500 Users | 1,000 Users | 2,000 Users |
|---|---|---|---|---|
| **Supabase** | $2,100-3,540 | $2,100-3,540 | $3,000-4,500 | $4,500-7,000 |
| **Clerk** | $0 | $0 | $0 (free tier) | $0 (free tier) |
| **BoldSign** | $3,000 | $3,500 | $4,500 | $6,000 |
| **Vercel** | $1,200-2,400 | $1,200-2,400 | $1,200-2,400 | $1,200-2,400 |
| **Tailscale** | $360-504 | $480-720 | $480-720 | $720-1,080 |
| **GitHub** | $240-480 | $240-480 | $240-480 | $240-480 |
| **Domain & DNS** | $180 | $180 | $180 | $180 |
| **Monitoring** | $0 | $0 | $0 | $0 |
| **Email** | $240 | $240 | $240 | $480 |
| **ANNUAL TOTAL** | **$7,320-12,504** | **$7,940-13,464** | **$9,840-16,644** | **$13,920-23,640** |
| **Monthly Average** | **$610-1,042** | **$662-1,122** | **$820-1,387** | **$1,160-1,970** |

**Key Observations:**

1. **Tier 1 (300-500 users):** Most vendors remain in lower-cost tiers. Monthly SaaS costs: ~$610-1,042
2. **Tier 2 (500-1,000 users):** Marginal increases in Supabase usage, BoldSign volume. Monthly costs: ~$662-1,122
3. **Tier 3 (1,000-2,000 users):** Potential jump to Supabase Team tier ($599/month) may trigger. Email/eSignature volume increases.
4. **Scaling efficiently:** Core platform SaaS costs scale sublinearly. Adding 1,000 users adds only ~$400-800/month in vendor costs.

---

## 3. INFRASTRUCTURE COSTS

### 3.1 Hardware (Proxmox Host)

**Minimum Specification (Homelab/Small Deployment):**

| Component | Specification | Cost (CAD) | Justification |
|---|---|---|---|
| CPU | Intel Xeon E5-2680 v3 (12c/24t, used) | $150-300 | Sufficient for 300-500 users |
| Motherboard | Used enterprise-grade | $100-200 | Stability, IPMI for remote management |
| RAM | 64 GB DDR4 ECC | $200-350 | 16GB OS, 48GB VM allocation |
| Storage (SSD) | 4TB NVMe + 2TB SSD | $600-800 | Fast VM storage, database I/O |
| PSU | 750W Bronze 80+ | $150-250 | Reliable power delivery |
| Case/Cooling | Used server chassis | $100-200 | Thermal management |
| **Minimum Total** | **—** | **$1,300-2,100** | **One-time cost** |

**Recommended Specification (Reliability + Performance):**

| Component | Specification | Cost (CAD) | Justification |
|---|---|---|---|
| CPU | Intel Xeon Gold 6242 (16c/32t) or AMD EPYC 7262 | $400-800 | 1,000+ user capacity, low power |
| Motherboard | New enterprise-grade (Supermicro) | $500-800 | Redundancy, remote management |
| RAM | 128 GB DDR4 ECC registered | $600-1,000 | Growth headroom, database cache |
| Storage (NVMe) | 2x 2TB NVMe (RAID 1) | $600-1,000 | Fast, redundant VM storage |
| Storage (HDD) | 4x 4TB SAS 7.2K (RAID 6) | $800-1,200 | Backup, archival, resilience |
| PSU | 2x 1000W Redundant | $400-600 | N+1 power redundancy |
| Case/Cooling | Proper server chassis, dual fans | $400-600 | Professional cooling |
| Rack + PDU | Networking rack, power distribution | $500-800 | Organization, cable management |
| **Recommended Total** | **—** | **$4,200-7,900** | **One-time cost** |

**Amortization (Capital Expense):**

| Scenario | Hardware Cost | 3-Year Amortization | 5-Year Amortization |
|---|---|---|---|
| Minimum (used) | $1,500 | $42/month | $25/month |
| Recommended (new) | $6,000 | $167/month | $100/month |
| Enterprise-grade | $15,000 | $417/month | $250/month |

**Current Status Assumption:** MDM Group likely has existing Proxmox infrastructure. **Recommended approach:** Use existing hardware, budget for hardware refresh in Year 3-5.

---

### 3.2 Power and Connectivity

**Power Consumption Estimate:**

| Component | Wattage | Runtime | Monthly kWh |
|---|---|---|---|
| Proxmox host (recommended spec) | 400-500W | 24/7 | 288-360 kWh |
| Network equipment (TP-Link Omada) | 50W | 24/7 | 36 kWh |
| UPS (runtime, not continuous) | 50W avg | 2 hrs/month | 3 kWh |
| **Total monthly** | **—** | **—** | **327-399 kWh** |

**Power Cost (Ontario Hydro rates 2026):**

- Residential rate: ~$0.16/kWh (winter), ~$0.12/kWh (summer)
- Average: ~$0.14/kWh
- Monthly cost: 360 kWh × $0.14 = **~$50/month**
- Annual: **$600**

**Internet Connectivity:**

| Type | Speed | Provider (GTA) | Monthly Cost |
|---|---|---|---|
| Consumer ISP | 300 Mbps / 20 Mbps | Rogers/Bell | $80-120 |
| Business ISP | 100 Mbps / 10 Mbps | Cogeco Business | $150-200 |
| Business ISP | 300 Mbps / 50 Mbps | Bell Business | $200-300 |

**Recommendation for 300-1,000 users:**
- Upload-heavy (file sync, photo uploads, e-signatures)
- Minimum 50 Mbps upload recommended
- **Recommended:** Business ISP at $200-250/month ($2,400-3,000/year)

**Backup ISP (Optional but Recommended):**
- Mobile hotspot (Rogers/Bell Business): $50-100/month
- Ensures 99.9% uptime SLA
- **Optional cost:** $600-1,200/year

---

### 3.3 Colocation (Alternative to Home Lab)

**When to Consider Colo:** If Proxmox home lab faces reliability, power, or connectivity constraints.

**GTA-Area Colocation Providers:**

| Provider | Location | Rack Space (U) | Power | Bandwidth | Monthly Cost (CAD) |
|---|---|---|---|---|---|
| Equinix TOR2 | Toronto | 2U | 2.5 kW | 1 Gbps unmetered | $600-800 |
| Distributel | Toronto | 1U | 2 kW | 100 Mbps | $300-400 |
| Cologix | Toronto | 2U | 3 kW | 1 Gbps | $500-700 |
| Communitech Hub | Kitchener | 1U | 1.5 kW | 100 Mbps | $250-350 |

**Colocation Cost Breakdown (2U, 100 Mbps):**

| Item | Monthly | Annual |
|---|---|---|
| Rack space (2U) | $400-500 | $4,800-6,000 |
| Power (2.5 kW) | $150-200 | $1,800-2,400 |
| Bandwidth (unmetered 1 Gbps) | $100-150 | $1,200-1,800 |
| Remote hands/IPMI | $50 | $600 |
| **Total** | **$700-900** | **$8,400-10,800** |

**Colo vs. Home Lab (Annual Cost Comparison):**

| Cost Category | Home Lab | Colo (2U) |
|---|---|---|
| Power | $600 | $1,800-2,400 |
| Internet (business grade) | $2,400-3,000 | Included in rack cost |
| UPS/Backup power | $100 | Included |
| Hardware (depreciation) | $500-2,000 | $500-2,000 |
| Maintenance labor | $2,000-4,000 | $600 (remote hands) |
| **Total** | **$5,600-9,600** | **$11,400-15,200** |

**Recommendation:** Remain with Proxmox home lab for cost efficiency. Colo useful only if reliability or compliance (HIPAA, SOC 2) require certified data center.

---

## 4. SOFTWARE LICENSING COSTS

### 4.1 Development Tools

**IDE and Code Editors:**

| Tool | License Model | Annual Cost (CAD) | Features |
|---|---|---|---|
| VS Code | Free (open-source) | $0 | Full-featured, extensions |
| JetBrains IntelliJ IDEA | $200 USD/year per seat | $300-350 CAD | IDE, debugger, profiler |
| Cursor (VS Code fork) | Free or Pro ($20/month) | $0-240/year | AI-powered coding |
| Nova (Panic) | One-time license | $100-150 CAD | macOS only, lightweight |

**Recommendation for 5-10 developer team:**
- Lead developer: Cursor Pro at $240/year (AI assistant)
- Rest: VS Code Free ($0)
- **Total: $240/year for AI enhancement**

---

**Design and Prototyping:**

| Tool | License Model | Monthly Cost | Annual Cost (CAD) | Seats |
|---|---|---|---|---|
| Figma | Free tier or Pro | $0 or $12 USD/month | $0-200 | 1-3 |
| Adobe XD | $10.99 USD/month | $11 USD/month | $170/year | 1 |
| Sketch | $11 USD/month (subscription) | $11 USD/month | $170/year | 1 |

**Recommendation for 1-2 designer:**
- Figma Pro: $12 USD/month × 2 = $24 USD = **~$360 CAD/year**
- Includes prototyping, design systems, developer handoff

---

**Project Management:**

| Tool | License Model | Monthly Cost | Annual Cost | Users |
|---|---|---|---|---|
| Linear | $10/user/month | $50-100 | $600-1,200 | 5-10 |
| Jira | Free (Open Source) or $10/user/month | $0 or $50-100 | $0-1,200 | Unlimited free |
| Asana | $11-24.99 USD/user/month | $60-130 | $1,000-2,000 | 5-10 |
| Monday.com | $10 USD/user/month | $50-100 | $600-1,200 | 5-10 |

**Recommendation:**
- Free option: Jira Cloud (free for open-source projects)
- Paid option: Linear at $10/user/month for 5-10 users = **$600-1,200/year**

**Linear preferred:** Modern interface, built for software teams, GitHub integration.

---

**Communication (Already Covered by Microsoft 365):**

| Tool | Existing License | Notes |
|---|---|---|
| Slack | Not licensed (alternative) | MDM Group uses Teams (M365) |
| Microsoft Teams | Included in M365 | Already licensed |
| Discord | Free | Optional developer channel |
| Slack (optional) | $8-12 USD/user/month | Only if Teams insufficient |

**Recommendation:** Use existing Teams from M365. No additional cost.

---

### 4.2 ERPNext

**Software Licensing:**

| Component | Cost | License | Notes |
|---|---|---|---|
| ERPNext codebase | $0 | GPL v3 (open-source) | Free software, no licensing fee |
| Frappe Framework | $0 | MIT (open-source) | Free software |
| Self-hosting | $0 | Open-source | Deploy on Proxmox |

**Support and Professional Services (Optional):**

| Service | Provider | Annual Cost (CAD) | Scope |
|---|---|---|---|
| Community support | Reddit/GitHub/Forums | $0 | Volunteer community |
| Official support | Frappe Technologies | $10,000-30,000 USD | Priority support SLA |
| Implementation partner | Frappe partner network | $30,000-100,000 | Custom setup, configuration |
| Training | Frappe Academy | $5,000-15,000 | Team onboarding |

**Recommendation for KrewPact (Internal Use):**
- No official support license needed initially
- Community support sufficient for construction domain configuration
- Budget $5,000-10,000 if professional implementation required

**Cost for in-house development:**
- Annual: $0 software + $5,000-10,000 implementation = **$5,000-10,000 Year 1 only**

---

### 4.3 Microsoft 365

**Current MDM Group License:**

| Product | License Type | Per-User Cost | Scope |
|---|---|---|---|
| Microsoft 365 Business Standard | Already licensed | $20 USD/user/month | 300+ employees |
| Azure AD (Microsoft Entra ID) | Included in M365 | $0 additional | App registration, SSO |
| Office apps (Word, Excel, etc.) | Included in M365 | $0 additional | Desktop + web |

**Additional Licensing for KrewPact:**

| Item | Cost | Justification |
|---|---|---|
| Service account licenses (2-3) | $60-90/month | API integrations, scheduled jobs |
| Azure App Registration | $0 | Included with M365 tenant |
| **Annual additional cost** | **$720-1,080** | Service accounts only |

**Recommendation:**
- Existing M365 licenses cover all users
- Add 2-3 service accounts for API integration: **$720-1,080/year**

---

## 5. DEVELOPMENT COSTS

### 5.1 Team Composition Options

**Market Rates for Ontario, Canada (2026):**

| Role | Full-Time Salary (CAD) | Contract Rate (CAD/hour) | Offshore (USD/hour) | Burden Rate (CAD) |
|---|---|---|---|---|
| Full-Stack Developer | $70,000-100,000 | $60-85 | $25-45 | 1.25x (benefits, taxes) |
| Frontend Developer | $65,000-90,000 | $55-75 | $20-35 | 1.25x |
| Backend Developer | $75,000-110,000 | $65-90 | $30-50 | 1.25x |
| DevOps Engineer | $80,000-120,000 | $75-100 | $35-55 | 1.25x |
| UI/UX Designer | $60,000-85,000 | $50-70 | $15-30 | 1.25x |
| QA Engineer | $55,000-75,000 | $45-60 | $15-25 | 1.25x |
| Project Manager | $65,000-95,000 | $55-75 | $20-35 | 1.25x |

**Notes:**
- Burden rate includes benefits, CPP, EI, payroll taxes, workspace overhead
- Contract rates assume 1,200 billable hours/year (1,760 working hours - vacation, admin)
- Offshore rates for nearshore (Mexico, Colombia) or farshore (India, Philippines)

---

### 5.2 AI-Augmented Development

**AI Tools Productivity Impact:**

| Tool | Monthly Cost | Purpose | Productivity Gain |
|---|---|---|---|
| Cursor Pro | $20/month | AI code completion, refactoring | 40-60% faster coding |
| Claude API | $5-50/month (usage-based) | Automated testing, documentation | 30-50% faster auxiliary tasks |
| GitHub Copilot | $10/month | Code suggestions, function generation | 25-40% faster coding |
| n8n Automation | $0 (self-hosted) or $50/month | Workflow automation, no-code integration | 50-80% faster API integration |

**Recommended Stack for KrewPact:**

| Tool | Cost/Month | Full Team (5 devs) | Purpose |
|---|---|---|---|
| Cursor Pro | $20 | $100/month | Primary coding environment |
| Claude API | $25 (budget allowance) | $25/month | Batch documentation, testing |
| n8n (self-hosted) | $0 | $0/month | Workflow automation, data sync |
| **Monthly Total** | **—** | **$125/month** | **—** |
| **Annual Total** | **—** | **$1,500/year** | **5-developer team** |

**Productivity Multiplier Analysis:**

Assuming a 5-developer team without AI tools:
- Baseline: 5 developers × $85K/year = $425K/year labor cost
- Productivity loss: miscommunication, manual testing, debugging overhead = 20-30% inefficiency = ~$85K-127K/year wasted effort

With AI-augmented development:
- Cursor Pro reduces coding time by 40%
- Claude API automates testing + documentation (30% of effort)
- n8n eliminates manual API integrations (50% of integration time)
- **Net productivity gain: 25-35% = $106K-149K/year in equivalent labor**
- AI tool cost: $1,500/year
- **ROI: 71:1 return on investment**

---

### 5.3 Development Scenarios

#### **Scenario A: Solo Developer + AI (Founder Model)**

**Team Composition:**
- 1 full-stack developer (founder or co-founder)
- AI tools (Cursor Pro, Claude API)
- No dedicated QA or DevOps (founder handles)

**Cost Breakdown (Year 1):**

| Item | Cost |
|---|---|
| Founder salary (Year 1, reduced) | $40,000-60,000 |
| Cursor Pro | $240 |
| Claude API budget | $300 |
| GitHub Team | $240 |
| Vercel Pro (1 user) | $240 |
| Tailscale Starter (1 user) | $72 |
| **Monthly labor (Year 1)** | $3,333-5,000 |
| **Annual labor (Year 1)** | $40,000-60,000 |
| **Annual SaaS + tools** | $7,320-12,504 |
| **Total Year 1** | **$47,320-72,504** |

**Realistic Output (Year 1):**
- MVP launch: 3-4 months
- Core features (job tracking, materials, timesheets): 5-6 months
- Integration with ERPNext: 2-3 months
- Beta testing with 20-50 pilot users: 2-3 months
- **Timeline: 12-16 months to production**

**Scaling Challenges:**
- Burnout risk if working 60-70 hour weeks
- Limited capacity for customer support, DevOps, QA
- Technical debt accumulates without dedicated backend developer

**Recommendation:** Viable for MVP phase only. Requires team expansion by Month 9-12.

---

#### **Scenario B: Small Team (2-3 Developers)**

**Team Composition:**
- 1 full-stack lead developer ($95K/year)
- 1 frontend developer ($85K/year) OR 1 backend developer ($105K/year)
- 1 part-time DevOps/QA (contractor, 20 hrs/week) ($50K/year equivalent)
- Shared project management (lead developer wears PM hat)

**Cost Breakdown (Year 1):**

| Item | Cost |
|---|---|
| Lead full-stack developer | $95,000 × 1.25 = $118,750 |
| Frontend OR backend developer | $85,000-105,000 × 1.25 = $106,250-131,250 |
| Part-time DevOps (20 hrs/week @ $75/hr) | $39,000 |
| Cursor Pro (2 licenses) | $480 |
| Claude API | $300 |
| GitHub Team (2 users) | $480 |
| Vercel Pro (2 users) | $480 |
| Tailscale Starter (2 users) | $144 |
| Linear PM tool | $1,200 |
| Figma design tool | $360 |
| **Monthly labor** | $13,354-15,104 |
| **Annual labor** | $160,254-181,504 |
| **Annual SaaS + tools** | $8,020-13,804 |
| **Total Year 1** | **$168,274-195,308** |

**Realistic Output (Year 1):**
- MVP launch: 2-3 months
- Core features (job tracking, materials, timesheets, invoicing): 4-5 months
- Integration with ERPNext: 3-4 months
- E-signature integration (BoldSign): 1 month
- Advanced features (analytics, reporting): 2-3 months
- Beta testing with 50-100 pilot users: 2 months
- **Timeline: 12-14 months to production**

**Advantages:**
- Faster development velocity (parallel work on frontend/backend)
- Knowledge redundancy (2 developers mitigate single-point-of-failure risk)
- Continuous deployment/DevOps handled by dedicated person
- Team can handle customer issues without blocking development

**Scaling Path:**
- Add 3rd developer by Month 8
- Add dedicated QA tester by Month 10
- Add customer success manager by Month 12

**Recommendation:** Ideal for commercial launch. Balanced cost vs. velocity.

---

#### **Scenario C: Hybrid (1 Developer + Offshore Support)**

**Team Composition:**
- 1 senior full-stack developer (lead, Toronto) ($95K/year)
- 2-3 offshore backend developers (India/Philippines) working async
- 1 part-time QA (offshore contractor)

**Cost Breakdown (Year 1):**

| Item | Cost |
|---|---|
| Lead developer (Toronto) | $95,000 × 1.25 = $118,750 |
| 2 offshore backend devs @ $35/hr × 1,200 hrs | $84,000 |
| 1 part-time offshore QA @ $25/hr × 600 hrs | $15,000 |
| Coordination/PM overhead (lead, 20%) | $23,750 |
| Timezone tools (async communication) | $500 |
| Cursor Pro (1 license) | $240 |
| Claude API | $300 |
| GitHub Enterprise (for team size) | $2,400 |
| Vercel Pro (1 user) | $240 |
| **Monthly labor + PM** | $13,792 |
| **Annual labor + PM** | $165,450 |
| **Annual SaaS + tools** | $12,120-13,620 |
| **Total Year 1** | **$177,570-179,070** |

**Challenges with Offshore Model:**
- Asynchronous communication delays (6-12 hour timezone gap)
- Code quality variance (requires strong lead developer for code review)
- Integration complexity (ERPNext + custom modules require understanding of architecture)
- Compliance (if handling client data, data residency requirements)
- Less efficient for rapid iteration (Agile 2-week sprints become difficult)

**Advantages:**
- 40-50% lower labor costs vs. all-Ontario team
- Can scale backend resources quickly
- Allows lead developer to focus on architecture + client facing

**Realistic Output (Year 1):**
- Similar to Scenario B due to coordination overhead
- Additional 2-4 weeks for code review, rework of offshore deliverables

**Recommendation:** Cost-effective for steady-state development. Not ideal for initial MVP phase where direction is rapidly evolving.

---

## 6. ONGOING OPERATIONAL COSTS

### 6.1 Monthly Recurring Costs

| Category | Item | Monthly Cost | Annual Cost | Notes |
|---|---|---|---|---|
| **SaaS & Vendors** | Supabase | $175-295 | $2,100-3,540 | Database + storage |
| | Clerk | $0 | $0 | Free tier (< 50K MAU) |
| | BoldSign | $250 | $3,000 | E-signatures at 200-400 docs/month |
| | Vercel | $100-200 | $1,200-2,400 | Frontend hosting |
| | Tailscale | $30-42 | $360-504 | Secure networking |
| | GitHub | $20-40 | $240-480 | Code hosting + CI/CD |
| | Resend Email | $20 | $240 | Transactional email |
| | Domain + DNS | $15 | $180 | Cloudflare |
| **Subtotal SaaS** | | **$610-862** | **$7,320-12,504** | |
| **Infrastructure** | Power (Proxmox + network) | $50 | $600 | Ontario Hydro |
| | Internet (business ISP) | $200-250 | $2,400-3,000 | 50 Mbps upload minimum |
| | UPS/backup battery | $20 | $240 | Replacement reserve |
| **Subtotal Infrastructure** | | **$270-320** | **$3,240-3,840** | |
| **Security & Compliance** | SSL certificates | $0 | $0 | Free via Let's Encrypt |
| | Backup service | $50-100 | $600-1,200 | Incremental offsite backup |
| **Subtotal Compliance** | | **$50-100** | **$600-1,200** | |
| **Administrative** | Accounting/bookkeeping (10 hrs/month) | $200-250 | $2,400-3,000 | Contract accountant |
| | Legal/licensing review (quarterly) | $100 | $400 | SLA + compliance updates |
| **Subtotal Admin** | | **$300-350** | **$3,200-3,600** | |
| **TOTAL MONTHLY RECURRING** | | **$1,230-1,632** | **$14,360-21,144** | Year 2+ (no team) |

**Notes:**
- Does not include developer salary (separate from operational cost)
- Assumes in-house Proxmox (no colo costs)
- Assumes existing Proxmox infrastructure (no amortized hardware cost)

---

### 6.2 One-Time Costs (Year 1)

| Category | Item | Cost (CAD) | Timing | Notes |
|---|---|---|---|---|
| **Legal** | OSS licensing review (GPL v3 compliance) | $5,000-10,000 | Month 1 | Lawyer specializing in tech/IP |
| | Privacy policy + Terms of Service (construction-specific) | $5,000-8,000 | Month 2 | PIPEDA compliance for client data |
| | Data residency / regulatory review (Ontario construction) | $3,000-5,000 | Month 3 | Confirms compliance with AODA, PIPEDA |
| **Security** | Penetration testing (initial) | $5,000-15,000 | Month 8-10 | Before production launch |
| | AODA accessibility audit | $3,000-5,000 | Month 6 | WCAG 2.1 AA compliance check |
| **Infrastructure** | Hardware purchase (if needed) | $0-6,000 | One-time | Assume existing Proxmox available |
| | Cabling, UPS, PDU setup | $500-1,000 | One-time | If new Proxmox build |
| | Network equipment (already have TP-Link Omada) | $0 | One-time | Existing equipment |
| **Branding & Domain** | Domain registration (1st year) | $180 | Month 1 | Annual renewal $180 |
| | Logo + brand guidelines (Fiverr/Upwork) | $500-2,000 | Month 1 | If not using existing MDM brand |
| | Website design (optional) | $2,000-5,000 | Month 2 | Landing page, demo video |
| **Training & Onboarding** | Customer onboarding flow development | Included in dev | Months 6-8 | Part of core platform |
| | Documentation + help center (MkDocs) | $2,000-4,000 | Month 10 | Videos, written docs, FAQs |
| | Staff training (internal, 2 days) | $1,000-2,000 | Month 9 | Workshops for MDM team |
| **Database Migration** | ERPNext data mapping + import | $2,000-5,000 | Month 8 | Cleanup, transformation, validation |
| | Historical data archive setup | $500-1,000 | Month 8 | Backup + offline storage |
| **Testing & QA** | Third-party integration testing | $2,000-4,000 | Month 9 | Verify Quickbooks, supplier APIs |
| | Load testing (simulated 500+ users) | $2,000-3,000 | Month 10 | Confirms performance limits |
| **TOTAL ONE-TIME COSTS** | | **$31,680-71,000** | | Average: $50K |

---

## 7. TOTAL COST OF OWNERSHIP (TCO)

### 7.1 Year 1 TCO (Development Phase)

**Scenario B: Small Team (2-3 Developers) - Recommended**

| Cost Category | Amount (CAD) | Notes |
|---|---|---|
| **Development Team** | $160,254-181,504 | 2-3 developers for 12 months |
| **SaaS & Vendors (recurring)** | $8,020-13,804 | $670-1,150/month average |
| **Infrastructure** | $3,240-3,840 | Power + business ISP |
| **One-Time Costs** | $31,680-71,000 | Legal, security, branding, docs |
| **Administrative** | $3,200-3,600 | Accounting, legal reviews |
| **Backup / Contingency (10%)** | $20,960-27,575 | Unexpected costs, scope creep |
| **TOTAL YEAR 1** | **$227,354-301,323** | Mid-point: **$264,000** |

**Cost Breakdown by Month:**

| Phase | Months | Monthly Team Cost | Monthly Ops Cost | Total Phase Cost |
|---|---|---|---|---|---|
| MVP Development | Months 1-4 | $13,354 | $1,500 | $59,000 |
| Core Feature Build | Months 5-8 | $13,354 | $1,500 | $59,000 |
| Integration + Testing | Months 9-10 | $13,354 | $1,500 | $29,700 |
| Beta Launch Prep | Months 11-12 | $13,354 | $1,500 | $29,700 |
| One-time Costs | Spread across year | — | — | $50,000 |
| **Year 1 Total** | **12 months** | **$160,254** | **$18,000** | **$227,400** |

---

### 7.2 Year 2+ TCO (Steady State)

**Assumptions:**
- Team stabilizes at 2-3 developers (or 1 lead + offshore)
- No major feature rewrites
- Focus on customer support, maintenance, bug fixes
- Platform serves 300-500 internal users + 200-500 external

| Cost Category | Annual Cost (CAD) | Monthly Cost | Notes |
|---|---|---|---|
| **Development Team** | $180,000-210,000 | $15,000-17,500 | Maintenance + new features |
| **Additional Developers** | $0-52,500 | $0-4,375 | Optional (based on scaling) |
| **SaaS & Vendors** | $12,000-20,000 | $1,000-1,667 | Scales with user base |
| **Infrastructure** | $3,240-3,840 | $270-320 | Power + ISP |
| **Administrative** | $3,200-3,600 | $267-300 | Accounting + legal |
| **Support / Monitoring** | $3,600-6,000 | $300-500 | Customer support tickets |
| **TOTAL YEAR 2+** | **$202,040-245,940** | **$16,837-20,495** | Ongoing operations |

**Year 2-5 Projection:**

| Year | Team Size | Annual Development Cost | Annual Total Cost | Cumulative TCO |
|---|---|---|---|---|
| Year 1 | 2-3 devs | $160,254 | $227,354 | $227,354 |
| Year 2 | 2-3 devs | $180,000 | $202,040 | $429,394 |
| Year 3 | 3-4 devs | $210,000 | $233,040 | $662,434 |
| Year 4 | 4-5 devs | $245,000 | $268,040 | $930,474 |
| Year 5 | 5-6 devs | $280,000 | $303,040 | $1,233,514 |

---

### 7.3 TCO Comparison

**Option A: KrewPact (Custom Platform)**

| Timeframe | Cost | Per-User Cost (500 users) |
|---|---|---|
| Year 1 | $264,000 | $528/user |
| Year 1-3 Cumulative | $662,000 | $443/user |
| Year 1-5 Cumulative | $1,230,000 | $328/user |

---

**Option B: JobTread (Feature Floor Benchmark)**

**JobTread Pricing (as of 2026):**
- Per-user pricing: $40-60 USD/month (~$55-85 CAD)
- Assume 500 active users

| Timeframe | Monthly Cost | Annual Cost | 5-Year Total |
|---|---|---|---|
| 500 users | $2,750-4,250 | $33,000-51,000 | $165,000-255,000 |
| 1,000 users | $5,500-8,500 | $66,000-102,000 | $330,000-510,000 |

**JobTread TCO Comparison:**

| Timeframe | KrewPact | JobTread (500 users) | Difference |
|---|---|---|---|
| Year 1 | $264,000 | $33,000-51,000 | KrewPact costs +$213K-231K |
| Year 1-5 | $1,230,000 | $165,000-255,000 | KrewPact costs +$975K-1,065K |
| **Cost per user (Year 5)** | $328 | $55-110 | KrewPact higher |

**Break-Even Analysis for KrewPact:**

KrewPact becomes cost-competitive at user count where:
- KrewPact cumulative cost = JobTread cumulative cost
- Assumes JobTread scales linearly with users

| User Count | KrewPact Year 5 Cost (Amortized) | JobTread Year 5 Cost | Winner |
|---|---|---|---|
| 500 users | $246/user | $54-108/user | JobTread |
| 1,000 users | $246/user | $54-108/user | JobTread |
| 2,000 users | $246/user | $54-108/user | JobTread |

**Note:** JobTread serves as the feature floor benchmark — the minimum KrewPact must match across all phases. KrewPact's cost is justified because:
1. **White-labeled commercial offering** ($500-1,000/month per client)
2. **Proprietary features** that exceed the JobTread feature floor
3. **Data residency/compliance** requirements (on-premises critical)
4. **Strategic lock-in** to MDM Group ecosystem

---

**Option C: Procore / Buildertrend (Enterprise Platform)**

**Procore Pricing:**
- Core: $35-50 USD/month per user (~$50-70 CAD)
- Advanced: $50-80 USD/month per user (~$70-110 CAD)
- Assume 500 users on Advanced tier

| Timeframe | Monthly Cost | Annual Cost | 5-Year Total |
|---|---|---|---|
| 500 users | $17,500-27,500 | $210,000-330,000 | $1,050,000-1,650,000 |
| 1,000 users | $35,000-55,000 | $420,000-660,000 | $2,100,000-3,300,000 |

**Procore TCO vs KrewPact:**

| Metric | KrewPact | Procore (500 users) |
|---|---|---|
| Year 1 cost | $264,000 | $210,000-330,000 |
| Year 1-5 cost | $1,230,000 | $1,050,000-1,650,000 |
| Competitive cost zone | **Matches Procore** | **High cost** |

**Interesting Finding:** KrewPact Year 1-5 TCO is competitive with Procore's pricing. However, Procore includes significant services (training, implementation, support) that KrewPact requires separate vendors for.

---

**Recommendation:**

| Scenario | Best Option | Rationale |
|---|---|---|
| **Lower costs, SaaS simplicity** | JobTread | Cheapest option ($33K-51K/year for 500 users) |
| **In-house control, compliance critical** | KrewPact | Custom platform supports 99.9% SLA, data residency |
| **Enterprise features required** | Procore | Comprehensive platform, but expensive |
| **Strategic lock-in to MDM ecosystem** | KrewPact | Future white-label revenue potential |

**Final Recommendation:** JobTread defines the feature floor — the minimum set of capabilities KrewPact must match or exceed across all phases. KrewPact's higher Year 1-5 TCO is justified by the white-label commercial opportunity, full control over MDM-specific workflows, data residency, and proprietary features that go beyond what JobTread provides.

---

## 8. REVENUE AND ROI (IF COMMERCIALIZED)

### 8.1 Pricing Model Options (B2B SaaS)

**Market Analysis: Construction Management Software Pricing (2026)**

| Product | Tier | Monthly/User | Features | Market Position |
|---|---|---|---|---|
| JobTread | Standard | $50 CAD | Basic job tracking | Budget-friendly |
| BuilderTrend | Professional | $60 CAD | Job + customer portal | Mid-market |
| Procore | Core | $70 CAD | Core + integrations | Enterprise |
| Bridgit Bench | Advanced | $40 CAD | Resource planning focus | Niche |
| Touchplan | Team | $45 CAD | Kanban-based | Specialty |

---

**KrewPact Pricing Options:**

#### **Option 1: Per-User Pricing (Simplest)**

| Tier | Price/User/Month (CAD) | Annual (50 users) | Annual (200 users) | Best For |
|---|---|---|---|---|
| Starter | $30 | $18,000 | $72,000 | Solopreneurs, micro-contractors |
| Professional | $50 | $30,000 | $120,000 | Established contractors (50-200 users) |
| Enterprise | $75 | $45,000 | $180,000 | Large construction firms |

**Advantages:** Simple billing, predictable revenue, industry standard.
**Disadvantages:** Discourages adoption of larger teams; leaves money on table for power users.

---

#### **Option 2: Per-Project Pricing (Usage-Based)**

| Tier | Price/Project/Month | Avg Projects/Month | Annual (500 projects/month) | Best For |
|---|---|---|---|---|
| Starter | $10 | 5-10 | $60,000 | Small contractors |
| Professional | $25 | 10-25 | $150,000 | Mid-size contractors |
| Enterprise | Custom | 25+ | $300,000+ | Large contractors |

**Advantages:** Aligns cost with customer value; scales with customer success.
**Disadvantages:** Unpredictable revenue for customers; creates admin overhead.

---

#### **Option 3: Tiered Subscription (Recommended)**

| Tier | Monthly Price (CAD) | Users Included | Projects | Storage | Support | Annual (50 customers) |
|---|---|---|---|---|---|---|
| **Starter** | $99 | 5 | Unlimited | 100 GB | Email | $59,400 |
| **Professional** | $299 | 25 | Unlimited | 500 GB | Email + Chat | $179,400 |
| **Enterprise** | Custom | 100+ | Unlimited | 2+ TB | Dedicated + SLA | $400,000+ |

**Revenue Projection at 50 customers:**

| Tier | Customers | Monthly Revenue | Annual Revenue |
|---|---|---|---|
| Starter | 20 | $1,980 | $23,760 |
| Professional | 25 | $7,475 | $89,700 |
| Enterprise | 5 | $5,000+ | $60,000+ |
| **Total** | **50** | **$14,455+** | **$173,460+** |

**Advantages:**
- Clear value propositions per tier
- Accounts for different customer sizes
- Industry-standard SaaS model
- Predictable, recurring revenue

**Recommended Pricing Tiers:**

| Tier | Price/Month | Target Customer | Size |
|---|---|---|---|
| **Starter** | $99 CAD | Solo contractors, freelancers | 1-5 users |
| **Professional** | $299 CAD | Small contractors, subcontractors | 5-25 users |
| **Enterprise** | Custom (min $999/month) | Large contractors, builders | 25+ users |

---

### 8.2 Break-Even Analysis

**Customer Acquisition & Lifetime Value:**

| Metric | Assumption | Annual Impact |
|---|---|---|
| Monthly churn rate | 3% (typical SaaS) | Customers drop out regularly |
| Average customer lifetime | 33 months (~2.75 years) | Standard for B2B |
| CAC (Customer Acquisition Cost) | $500-1,000 | Sales + marketing effort |
| LTV (Lifetime Value) | $1,750-2,700 | Avg customer pays $50-75/month × 33 months |
| LTV:CAC Ratio | 2-3:1 | Healthy is 3:1 or higher |

**Break-Even Calculation:**

Assumptions:
- Development + Year 1 operations: $264,000
- Customer acquisition: $500-1,000 per customer
- Average customer value: $150-200/month (Professional tier)
- Churn: 3% monthly

**Customers needed to break even (Year 1):**

```
Break-even customers = (Year 1 cost) / (monthly customer value)
= $264,000 / $150-200 per month
= 1,320-1,760 customer-months
= ~50-55 customers at steady-state (assuming no churn)
```

**Reality with churn:**

To maintain 50 customers with 3% monthly churn:
- Month 1: Need 50 customers
- Month 2: 50 × 0.97 = 49 remaining + 1 new (3% replacement)
- By Month 12: Need ~2-3 new customers/month to sustain 50

**Year 1 Scenario (Ramp-up):**

| Month | Customers | Churn Loss | New Signups | Monthly Revenue | Cumulative |
|---|---|---|---|---|---|
| Month 1 | 5 | — | 5 | $750 | $750 |
| Month 3 | 15 | 1 | 3 | $2,250 | $9,000 |
| Month 6 | 30 | 1 | 4 | $4,500 | $28,500 |
| Month 9 | 45 | 1 | 3 | $6,750 | $55,500 |
| Month 12 | 55 | 2 | 12 | $8,250 | $83,500 |

**Year 1 Total Revenue:** ~$83,500 (MRR grows from $750 to $8,250)
**Year 1 Actual Cost:** $264,000
**Year 1 Net:** -$180,500 (loss, as expected for SaaS startup)

**Break-Even Timeline:**

| Timeline | Customers | Monthly Revenue | Annual Revenue | Status |
|---|---|---|---|---|
| Year 1 (Month 12) | 55 | $8,250 | $99,000 | Still unprofitable |
| Year 2 (Month 6) | 85 | $12,750 | ~$153,000 | Approaching break-even |
| Year 2 (Month 12) | 120 | $18,000 | ~$216,000 | Break-even achieved |
| Year 3 | 150-200 | $22,500-30,000 | ~$270K-360K | Profitable |

**Key Finding:** KrewPact SaaS requires 120+ paying customers ($150-200/month avg) to break even in Year 2. Given typical B2B SaaS churn and acquisition rates, this is achievable but challenging.

---

### 8.3 Cost Per User (Internal)

**If KrewPact remains internal-only (no commercialization):**

| Scenario | Total Year 1-5 Cost | User Count (avg) | Cost/User (5-year) |
|---|---|---|---|
| Founder-led (Scenario A) | $750,000 | 400 users | $375/user |
| Small team (Scenario B) | $1,230,000 | 500 users | $492/user |
| Hybrid offshore (Scenario C) | $1,080,000 | 450 users | $480/user |

**Comparison to SaaS alternative (JobTread):**

| Year | Internal KrewPact (500 users) | JobTread SaaS (500 users) |
|---|---|---|
| Year 1 | $264,000 ($528/user) | $45,000 ($90/user) |
| Year 1-3 | $662,000 ($443/user) | $135,000 ($90/user) |
| Year 1-5 | $1,230,000 ($328/user) | $225,000 ($90/user) |

**Cost per user decreases over time for KrewPact** due to amortization of development investment, but JobTread remains cheaper for internal-only use.

**Decision Point:** KrewPact is only cost-justified if:
1. Internal use case requires customization beyond SaaS alternatives like JobTread (95% of unique requirements)
2. White-label commercial revenue is planned
3. Data residency / compliance mandates on-premises (critical for MDM)
4. Strategic advantage of proprietary features (job costing, resource optimization, etc.)

---

## 9. RISK FACTORS & CONTINGENCY

### Development Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Scope creep beyond MVP | +30-50% cost overrun | High | Define MVP strictly, use 2-week sprints, frozen feature list |
| Key developer departure | 6-12 week delay, rework | Medium | Documentation, code reviews, knowledge sharing |
| Integration delays (ERPNext, QuickBooks) | +4-8 week delay | Medium | Early prototype integration, vendor support contracts |
| Vendor price increases (Supabase, Vercel) | +10-20% cost impact | Medium | Lock pricing, evaluate alternatives (Fly.io, Render) |

### Operational Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Hardware failure (Proxmox host) | 24-48 hour downtime | Low | UPS, RAID, backup, spare hardware on standby |
| Internet outage | Service unavailable | Medium | Backup ISP (mobile hotspot), offline-first design |
| Security breach | Data loss, compliance penalties | Low | Pentest, bug bounty program, SOC 2 audit |
| Customer support overload | Revenue impact, churn | Medium | Helpdesk system, knowledge base, automation |

---

## 10. SUMMARY & RECOMMENDATIONS

### For Internal Use (MDM Group Only):

**Recommended Approach:** Small team (2-3 developers) with AI tools
- **Year 1 Investment:** $264,000 CAD
- **Break-even point:** Never (internal tool, no revenue)
- **Cost per user (Year 5):** $328/user
- **Value prop:** Data residency, custom features, zero SaaS dependency

**Savings vs. JobTread:** After Year 1, KrewPact costs less than JobTread ($90-110/user/year) due to amortized development. **Savings: ~$25K-35K/year on licensing alone after Year 2**.

---

### For Commercial White-Label (B2B SaaS):

**Recommended Approach:** Small team + AI tools + future sales/marketing hiring
- **Year 1 Investment:** $264,000 CAD (development + operations)
- **Year 2 Investment:** $202,000 CAD (operations + 2 sales/CS hires)
- **Break-even:** 120+ customers paying $150-200/month (achievable in Year 2-3)
- **Potential Year 3 revenue:** $270K-360K annually at 150-200 customers

**Growth scenario:** If KrewPact gains traction (white-label partnerships with construction firms), marginal cost per additional customer is only $500-1,000 (CAC). ROI becomes positive after 24-month ramp.

---

### Technology Stack Cost Efficiency:

1. **SaaS-first architecture:** $610-1,040/month ($7.3K-12.5K/year) is negligible vs. development costs.
2. **Self-hosted components:** Proxmox (free), Grafana (free), PostgreSQL (free) eliminate $1,000-2,000/month in managed services.
3. **AI-augmented development:** $1,500/year investment returns $100K+ in productivity gains (71:1 ROI).
4. **Open-source foundation (ERPNext, Next.js):** Eliminates $50K-100K in licensing fees.

---

### Final Financial Summary

| Metric | Value | Notes |
|---|---|---|
| **Year 1 total cost** | $264,000 CAD | Development-heavy year |
| **Years 2-5 annual cost** | $202K-303K CAD | Operations + team expansion |
| **Cost per user (internal, Year 1)** | $528/user | High due to amortization |
| **Cost per user (internal, Year 5)** | $328/user | Amortization benefits kick in |
| **Break-even (commercial SaaS)** | 120+ customers, Month 24 | Requires sales/marketing |
| **Recommendation** | Proceed with Scenario B | Small team + AI tools |

---

**Document Prepared:** February 2026
**MDM Group Location:** Mississauga, Ontario, Canada
**Scope:** KrewPact platform cost analysis, vendor pricing, development budgets

---

## Appendix: Vendor Contact Information & Trial Availability

| Vendor | Free Trial | Trial Duration | Contact |
|---|---|---|---|
| Supabase | Yes | 2 weeks (full features) | supabase.com |
| Clerk | Yes | Free tier, no credit card | dashboard.clerk.com |
| BoldSign | Yes | 14-day trial | boldsign.com |
| Vercel | Yes | Free tier + $20 credit | vercel.com |
| Tailscale | Yes | Free plan (3 devices) | tailscale.com |
| GitHub | Yes | Free tier (unlimited repos) | github.com |
| Resend | Yes | Free tier (100 emails/day) | resend.com |

---

**End of Document**
