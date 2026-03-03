# KrewPact Technology Stack: Architecture Decision Records

**Project**: KrewPact Construction Operations SaaS Platform
**Last Updated**: February 2025
**Document Status**: Comprehensive Technology Stack Definition

---

## Table of Contents

1. [ADR-001: Frontend Framework (React + Next.js)](#adr-001-frontend-framework-react--nextjs)
2. [ADR-002: Backend Architecture (Node.js BFF Pattern)](#adr-002-backend-architecture-nodejs-bff-pattern)
3. [ADR-003: Database Platform (Supabase PostgreSQL)](#adr-003-database-platform-supabase-postgresql)
4. [ADR-004: ERP System (ERPNext - Self-Hosted)](#adr-004-erp-system-erpnext---self-hosted)
5. [ADR-005: Authentication Provider (Clerk)](#adr-005-authentication-provider-clerk)
6. [ADR-006: Electronic Signature Provider (BoldSign)](#adr-006-electronic-signature-provider-boldsign)
7. [ADR-007: Payroll Integration (ADP Workforce Now)](#adr-007-payroll-integration-adp-workforce-now)
8. [ADR-008: File Storage Strategy](#adr-008-file-storage-strategy)
9. [ADR-009: Job Queue and Background Processing](#adr-009-job-queue-and-background-processing)
10. [ADR-010: Frontend Hosting (Vercel)](#adr-010-frontend-hosting-vercel)
11. [ADR-011: ERPNext and Backend Hosting (Self-Hosted - Proxmox)](#adr-011-erpnext-and-backend-hosting-self-hosted---proxmox)
12. [ADR-012: Inter-Service Networking (Tailscale)](#adr-012-inter-service-networking-tailscale)
13. [ADR-013: Reverse Proxy (Nginx Proxy Manager)](#adr-013-reverse-proxy-nginx-proxy-manager)
14. [ADR-014: CI/CD Pipeline (GitHub Actions)](#adr-014-cicd-pipeline-github-actions)
15. [ADR-015: State Management (Frontend)](#adr-015-state-management-frontend)
16. [ADR-016: API Design (REST vs GraphQL vs tRPC)](#adr-016-api-design-rest-vs-graphql-vs-trpc)
17. [ADR-017: Real-Time Updates Strategy](#adr-017-real-time-updates-strategy)
18. [ADR-018: Offline-First Architecture for Field Operations](#adr-018-offline-first-architecture-for-field-operations)
19. [ADR-019: Multi-Tenancy and Division-Aware Data Model](#adr-019-multi-tenancy-and-division-aware-data-model)
20. [ADR-020: Search Infrastructure](#adr-020-search-infrastructure)
21. [ADR-021: Notification System Architecture](#adr-021-notification-system-architecture)
22. [ADR-022: Audit Trail Implementation](#adr-022-audit-trail-implementation)
23. [ADR-023: Caching Strategy](#adr-023-caching-strategy)
24. [ADR-024: Error Handling and Observability](#adr-024-error-handling-and-observability)
25. [ADR-025: Testing Strategy](#adr-025-testing-strategy)

---

## ADR-001: Frontend Framework (React + Next.js)

**Status**: Accepted

### Context

KrewPact is a construction operations SaaS platform that requires a rich, interactive user interface for managing projects, finances, personnel, and compliance across multiple divisions. The platform must support real-time updates, complex data visualization, responsive design for both desktop and mobile/tablet usage in the field, and server-side rendering for search engine optimization and performance.

The frontend needs to handle state management across multiple features including project dashboards, financial reporting, crew management, and compliance tracking. Additionally, the platform must integrate with third-party services (Clerk authentication, BoldSign e-signatures, ADP payroll) while maintaining a cohesive user experience.

### Decision

React with Next.js (App Router) has been selected as the frontend framework. The selection includes TypeScript for type safety and the implementation of the modern App Router pattern for file-based routing and server-side capabilities.

### Consequences

**Positive**:

- Next.js App Router provides native server-side rendering and static site generation, improving initial page load performance and enabling SEO optimization for public-facing content
- Server components reduce JavaScript bundle size by moving logic to the server, particularly important for complex dashboard pages
- Unified routing model simplifies navigation and reduces the need for multiple routing libraries
- Incremental Static Regeneration (ISR) enables serving stale content while regenerating in the background, improving performance for relatively static pages like project documentation
- Strong ecosystem integration with authentication providers like Clerk, making identity management implementation straightforward
- Built-in API routes simplify creating a lightweight Backend for Frontend (BFF) layer within the same codebase initially
- Excellent TypeScript support with strict type inference from server to client
- Native image optimization through the Next.js Image component reduces bandwidth and improves performance in field environments with poor connectivity
- Streaming and suspense boundaries allow progressive page rendering, improving perceived performance
- Vercel integration is seamless, providing preview deployments and analytics out of the box

**Negative**:

- App Router is relatively young with fewer third-party library compatibility guarantees compared to Pages Router; some libraries may require custom solutions
- Server-side rendering increases complexity compared to pure client-side frameworks, requiring careful consideration of what runs where
- Incremental Static Regeneration has limitations with highly dynamic content; frequent database queries in ISR can impact performance
- Learning curve for teams unfamiliar with React Server Components and the blended server/client component model
- Debugging server component issues requires different tools and approaches than debugging client-side code
- Caching headers and revalidation require careful configuration to avoid serving stale data unexpectedly
- Build times can increase with complex server-side logic, impacting deployment frequency

### Alternatives Considered

- **Vue.js with Nuxt**: Considered due to Nuxt's excellent developer experience and composable API. Rejected because React dominates the construction tech ecosystem, and the larger job market for React developers aligns better with long-term hiring plans. Nuxt would limit future contractor availability.
- **Svelte with SvelteKit**: Offered the smallest bundle size and excellent performance characteristics. Rejected because the smaller ecosystem meant fewer pre-built components for construction industry use cases, and reduced community support for integration libraries with Clerk and BoldSign.
- **Astro**: Excellent for static content and islands of interactivity. Rejected because KrewPact requires rich interactive dashboards and real-time state management that push against Astro's strengths; the overhead of managing islands would exceed the benefits.
- **Angular**: Previously considered for enterprise-grade features and TypeScript-first design. Rejected because of the steep learning curve, verbose boilerplate, and reduced developer productivity compared to React. The construction industry is rapidly adopting React, making it the strategic choice.

---

## ADR-002: Backend Architecture (Node.js BFF Pattern)

**Status**: Accepted

### Context

KrewPact integrates with multiple backend systems: a self-hosted ERPNext instance, Supabase PostgreSQL, ADP Workforce Now, BoldSign, and other third-party APIs. The frontend cannot directly consume all these APIs safely due to:

- Authentication and authorization logic that must be enforced server-side
- Rate limiting and quota management for expensive third-party services
- Data transformation and normalization across heterogeneous systems
- Secure credential management for external service integrations
- Business logic that shouldn't be exposed to the client
- Compliance requirements around audit logging and data access tracking

A Backend for Frontend (BFF) pattern addresses these concerns by creating a dedicated service layer that the frontend consumes, rather than directly integrating with all backends.

### Decision

A Node.js Backend for Frontend service has been selected to run alongside the Next.js frontend. This service will be deployed independently and communicate with the frontend via REST API (see ADR-016). The BFF will serve as the primary aggregation point for data from ERPNext, Supabase, ADP, and other services.

The BFF will be implemented using Express.js or Fastify, with TypeScript for type safety and code sharing with the frontend. It will run as a containerized service on the self-hosted Proxmox infrastructure, behind Nginx Proxy Manager.

### Consequences

**Positive**:

- Decouples frontend from backend complexity; frontend developers focus on UI while backend developers manage integrations
- Centralized location for authentication, authorization, and role-based access control, making security updates easier
- Enables request aggregation and batching to reduce chatty API calls to expensive services like ADP
- Allows implementing cross-cutting concerns (rate limiting, request logging, audit trails) in a single place
- TypeScript code sharing between frontend and backend improves type safety across the entire application
- Easier to implement complex business logic that involves multiple backend systems without exposing it to clients
- Simplifies caching strategies by centralizing cache invalidation logic
- Protects sensitive information (API keys, database passwords) from exposure to the client
- Enables gradual migration of features without changing the frontend API contract
- Allows independent scaling of frontend and backend tier

**Negative**:

- Introduces an additional network hop between frontend and backend, increasing latency
- Adds operational complexity requiring monitoring and management of another service
- Network failures between frontend and BFF can degrade user experience; requires client-side retry logic
- Double serialization (client to BFF, BFF to backend) adds computational overhead
- Increases operational footprint and resource consumption on self-hosted infrastructure
- Requires managing versioning and backwards compatibility of the BFF API as frontend evolves
- Debugging issues across frontend-BFF boundary is more complex than monolithic architecture
- Potential for cascading failures if BFF goes down, affecting all frontend functionality

### Alternatives Considered

- **GraphQL API**: Offers superior data fetching efficiency and self-documenting schema. Considered for reducing over-fetching in the dashboard. Rejected because GraphQL has a steeper learning curve, and the smaller ecosystem for construction industry GraphQL tools would limit integration velocity. Added complexity wasn't justified given the relatively bounded set of queries the frontend needs.
- **Direct Microservices Integration**: Frontend directly integrates with ERPNext API, Supabase API, ADP API with client-side orchestration. Rejected because credentials would need to be in the browser, security controls would be weakened, and client-side logic would become fragile and unmaintainable.
- **Monolithic Backend (separate from Next.js)**: Large Rails or Django application providing all backend functionality. Rejected because it moves away from JavaScript/TypeScript ecosystem benefits and reduces code sharing with the frontend. For a lean team, maintaining separate language ecosystems increases cognitive load.
- **Serverless Functions**: AWS Lambda or similar for individual endpoints. Rejected because the platform requires long-lived connections to ERPNext and other services; serverless cold starts would impact performance, and managing 20+ individual functions would be operationally complex compared to a single containerized BFF.

---

## ADR-003: Database Platform (Supabase PostgreSQL)

**Status**: Accepted

### Context

KrewPact requires a production-grade relational database for managing construction data: projects, financials, personnel, compliance records, and audit trails. The database must:

- Support complex queries across multiple tables and relationships
- Provide row-level security for multi-tenant data isolation
- Offer built-in replication and backup mechanisms
- Integrate with real-time capabilities for live updates
- Provide a REST API for rapid prototyping and integration
- Support JSON columns for flexible data structure in certain domains

The choice between managed PostgreSQL services and self-hosted solutions directly impacts operational burden, scalability, and cost.

### Decision

Supabase (managed PostgreSQL 15+) has been selected as the primary relational database. Supabase provides a managed PostgreSQL instance with built-in features including Row-Level Security, real-time subscriptions, a REST API, and straightforward backup management.

### Consequences

**Positive**:

- PostgreSQL is battle-tested in production environments and handles complex schemas required for construction operations
- Supabase's Row-Level Security policies provide database-level access control, ensuring data isolation across tenants and divisions even if application logic fails
- Built-in real-time subscriptions via WebSocket enable live updates without additional message queue infrastructure
- Supabase REST API enables rapid prototyping and direct frontend/BFF integration without writing REST endpoints for every query
- Managed service eliminates operational burden of database administration, backups, and patching
- JSONB columns provide flexibility for semi-structured data (custom fields, dynamic forms) while maintaining relational integrity
- Full-text search with tsvector and trigram GIN indexes suit construction data search requirements
- Excellent JSON query capabilities via jsonb_agg and related functions enable complex aggregations for reporting
- Strong PostgreSQL community means extensive documentation and third-party tool support
- Window functions enable financial calculations (running totals, period comparisons) required in accounting workflows

**Negative**:

- Supabase is not Canadian-hosted; data residency concerns may require additional privacy considerations or compliance documentation
- Managed service means limited control over instance configuration and performance tuning
- Vendor lock-in makes migration to other databases costly and time-consuming
- Pricing scales with data size and concurrent connections; heavy real-time subscription usage could increase costs
- Row-Level Security policies can become complex with nested logic, making debugging difficult
- PostgreSQL's maximum connections limit impacts concurrent user capacity; additional monitoring required
- Real-time subscriptions have latency limitations (typically <1 second) that may not be suitable for high-frequency trading or critical timing operations
- Backups and restore operations have time and resource trade-offs
- JSON columns can encourage schema-less design, reducing data consistency over time if not carefully managed
- Query planning can be unpredictable with complex JSONB queries; requires ongoing optimization and index tuning

### Alternatives Considered

- **Self-Hosted PostgreSQL on Proxmox**: Would provide complete control and eliminate vendor lock-in. Rejected because operational burden of managing backups, replication, high availability, and patching falls on the founder, diverting focus from product development. Supabase's automation of these concerns is worth the lack of control.
- **MongoDB or other NoSQL**: Would provide flexible schema for varying construction data structures. Rejected because relational integrity is critical for financial data, inventory management, and multi-tenant data isolation. NoSQL's weaker consistency guarantees would create compliance and debugging nightmares.
- **Firebase Firestore**: Offers real-time capabilities and simplified operations. Rejected because its document model doesn't map well to construction domain (projects, tasks, financials are inherently relational), and real-time pricing model would be expensive at scale.
- **MySQL/MariaDB**: Considered for familiarity and cost. Rejected because PostgreSQL's advanced features (JSONB, full-text search, window functions, better JSON support) are better suited to the construction domain, and JSON support in MySQL is significantly inferior.
- **DuckDB or Datafusion**: Modern OLAP databases offering excellent query performance. Rejected because they're designed for analytical workloads and OLTP characteristics of construction operations (frequent small updates, transactional consistency) require a database optimized for those patterns.

---

## ADR-004: ERP System (ERPNext - Self-Hosted)

**Status**: Accepted

### Context

KrewPact requires deep integration with enterprise resource planning functionality: bill of materials, inventory management, financial accounting, project costing, and procurement workflows. Building these from scratch would require 6-12 months of development and require ongoing maintenance for complex accounting rules and tax compliance.

ERPNext is an open-source ERP system built on Frappe, offering construction-specific modules, strong community support, and the flexibility of self-hosting. However, ERPNext is licensed under GNU General Public License Version 3 (GPL v3), which imposes specific obligations on derivative works and integrations.

### Decision

ERPNext will be deployed as a self-hosted instance on Proxmox, running as a containerized Frappe application. KrewPact will integrate with ERPNext via its REST API (Frappe API) through the Node.js BFF. The integration maintains a clear API boundary: ERPNext remains the system of record for ERP data, and the KrewPact frontend fetches data through the BFF layer.

KrewPact itself will not modify, extend, or distribute Frappe/ERPNext code; integration is purely through the API. This architectural boundary mitigates GPL v3 licensing implications. No GPL v3-licensed code will be embedded in the KrewPact codebase or distributed with KrewPact releases.

### Consequences

**Positive**:

- Eliminates 6-12 months of development effort for core ERP functionality; KrewPact can focus on construction-specific optimizations and user experience
- ERPNext community has significant construction industry expertise, providing pre-built patterns for bill of materials, project costing, and procurement
- Self-hosting provides complete control over data, infrastructure, and customization
- Frappe's API-first design makes integration straightforward through REST endpoints
- Open-source model allows auditing code for security and licensing compliance
- Strong community support means solving issues through documentation and community forums
- Flexibility to customize ERPNext Python backend without modifying core; Frappe's module system supports extensions
- Real-time synchronization of inventory, costing, and financial data through APIs
- Reduces product liability: ERPNext's accounting logic is established and widely used, whereas custom-built ERP would create support burden
- GPL v3 licensing is permissive about usage; only code distribution triggers obligations, not API integration

**Negative**:

- GPL v3 licensing creates contractual and legal obligations: if KrewPact code is distributed and links to ERPNext, full source must be made available
- Self-hosting operational burden: ERPNext requires maintenance, patching, backup, and monitoring
- API integration relies on ERPNext availability; if ERPNext instance goes down, KrewPact loses ERP functionality
- ERPNext's data model may not perfectly align with KrewPact workflows, requiring workarounds or custom development
- Learning curve for team to understand Frappe framework and ERPNext's complex architecture
- Upgrade cycles for ERPNext must be planned; breaking API changes require coordination across the stack
- Customizations to ERPNext Python code will require maintenance as ERPNext updates are released
- Performance issues in ERPNext directly impact KrewPact; limited visibility into internals makes debugging difficult
- ERPNext database schema is complex; direct database queries (outside API) are fragile and unsupported
- Migration from ERPNext in the future is extremely difficult and costly due to schema complexity

**GPL v3 Licensing Implications**:

GPL v3 is a copyleft license requiring that derivative works and modifications be made available under the same license. However, the KrewPact architecture mitigates these concerns:

1. **API Integration Model**: KrewPact integrates with ERPNext via REST API, not by linking or distributing ERPNext code. This is similar to how web services can integrate without triggering GPL obligations; the integration is at the service boundary, not at the code level.

2. **Separate Distribution**: KrewPact and ERPNext are deployed as separate applications. KrewPact source code does not bundle, include, or distribute Frappe or ERPNext code. KrewPact is distributed separately from ERPNext.

3. **No Derivative Works**: KrewPact does not modify the Frappe core or ERPNext codebase. Any customizations to ERPNext (extending with custom modules) are deployed separately in the ERPNext instance, not shipped with KrewPact.

4. **Best Practice Compliance**:
   - Clear documentation in the KrewPact source that ERPNext is a separate application licensed under GPL v3
   - No GPL v3-licensed code in the KrewPact repository
   - API integration is the only connection point between systems
   - If the source code for KrewPact is shared publicly, include a notice about ERPNext dependency and its licensing

5. **Risk Mitigation**:
   - If KrewPact is acquired, the purchaser assumes ERPNext's GPL v3 obligations only if they distribute KrewPact with ERPNext code
   - The API boundary provides a clean legal boundary; integration doesn't create a derivative work
   - Self-hosting means ERPNext is never distributed as part of KrewPact distribution

### Alternatives Considered

- **Odoo (open-source ERP)**: Another open-source ERP with strong industry support. Rejected because Odoo's LGPL v3 and commercial licensing is more complex to navigate, Odoo's API maturity is less proven than Frappe, and community documentation for construction workflows is thinner than ERPNext.
- **NetSuite or Oracle ERP**: Enterprise-grade cloud ERP systems. Rejected because costs ($10,000+ per month) exceed the product margin at KrewPact scale, vendor lock-in is severe, and customization is expensive and limited. Early-stage product cannot justify enterprise ERP costs.
- **SAP S/4HANA**: Market-leading ERP for large construction firms. Rejected for same reasons as NetSuite; cost and complexity far exceed current needs. Also, integration would be through pre-built connectors, limiting control.
- **Custom-Built ERP Modules**: Build accounting, inventory, and costing from scratch. Rejected because this represents 6-12 months of development effort, creates ongoing maintenance burden for complex accounting rules and tax compliance, and distracts from product differentiation. Frappe/ERPNext already solves this well.
- **Lightweight Integration with Accounting (QuickBooks)**: Integrate with QuickBooks Desktop or Online for accounting, manage inventory separately. Rejected because QuickBooks lacks project costing and bill of materials management, which are critical for construction operations. Adding custom systems on top creates fragmentation.

---

## ADR-005: Authentication Provider (Clerk)

**Status**: Accepted

### Context

KrewPact requires a secure, production-grade authentication system supporting:

- User account management and password security
- Multi-factor authentication (MFA) for compliance
- Social sign-on for user convenience (Google, Microsoft, etc.)
- Role-based access control integration with division and tenant structures
- Audit logging of authentication events
- Support for future B2B authentication workflows
- Simplified security compliance (outsourcing PCI DSS, HIPAA, SOC 2 responsibilities)

Building authentication from scratch introduces security risks (password storage, session management, MFA implementation). Using an established provider reduces the surface area for critical vulnerabilities.

### Decision

Clerk has been selected as the authentication provider. Clerk is a modern authentication platform offering email/password authentication, social sign-on, MFA, and a generous free tier. Integration is via SDKs for Next.js and the Node.js BFF.

**Important Note on Data Residency**: Clerk does not offer Canadian data residency. User authentication data (passwords, session information, user profiles) is stored in Clerk's US-based infrastructure. This must be documented for compliance purposes and disclosed to customers.

### Consequences

**Positive**:

- Eliminates implementation of authentication logic, reducing security attack surface
- Clerk's Next.js SDK integrates seamlessly with App Router, handling authentication middleware automatically
- Clerk manages password security, requiring strong passwords and supporting password reset workflows
- Built-in MFA (TOTP, SMS, backup codes) simplifies compliance with security requirements
- Social sign-on (Google, Microsoft) reduces friction for user onboarding
- Audit logging of authentication events supports compliance requirements
- Transparent pricing with generous free tier allows scaling without authentication becoming a cost driver
- Clerk's session management is secure by default, with automatic refresh tokens and secure storage
- SDKs handle edge cases (token refresh, logout across tabs) automatically
- Third-party audit and compliance (SOC 2 Type II) reduces KrewPact compliance burden

**Negative**:

- No Canadian data residency; user authentication data is stored in US infrastructure, creating data sovereignty concerns
- Vendor lock-in: switching providers requires significant user data migration
- Pricing becomes expensive at high user counts (potential scaling concern, though unlikely near term)
- Limited customization of authentication UI; branding is somewhat constrained
- Dependency on Clerk's API uptime; authentication failures cascade to entire platform
- Audit logging is available but requires active monitoring to be useful for compliance
- Some advanced use cases (custom authentication workflows) may require workarounds or direct API integration
- Third-party control over authentication credentials and session data

**Data Residency Mitigation**:

Since Clerk does not offer Canadian data residency, the following mitigation strategies should be implemented:

1. **Transparency and Disclosure**:
   - Clearly document in privacy policy that authentication data is stored in US infrastructure
   - Obtain explicit customer consent for non-Canadian authentication provider
   - Provide clear language about data handling in terms of service

2. **Technical Mitigations**:
   - Implement additional encryption at the application layer if sensitive customer data needs extra protection
   - Use Clerk webhooks to log authentication events in Supabase (Canadian-compatible), creating audit trail in compliant storage
   - Segregate user identity data from sensitive business data; keep sensitive data in Supabase (Canadian), reference identity via user ID from Clerk

3. **Legal and Compliance**:
   - Ensure Clerk's data processing agreements meet PIPEDA requirements for Canadian customers
   - Document legal basis for using US-based authentication (if customers are primarily US-based, this concern is reduced)
   - Consider regional expansion: if Canadian customers become significant revenue driver, re-evaluate authentication provider for Canadian-hosted alternative

4. **Business Continuity**:
   - Monitor Clerk uptime; implement fallback procedures if Clerk becomes unavailable
   - Plan for future migration path to Canadian provider if legal requirements change

### Alternatives Considered

- **Auth0 (by Okta)**: Enterprise-grade authentication with support for complex authorization rules. Rejected because pricing is expensive for the user scale KrewPact is targeting, Auth0 adds operational complexity not needed early on, and feature parity doesn't justify the cost differential.
- **Firebase Authentication**: Google's authentication service, seamless with Firebase ecosystem. Rejected because KrewPact uses Supabase, not Firebase; adding another Google service increases vendor lock-in, and Firebase is somewhat less flexible for complex multi-tenant authorization rules.
- **Keycloak**: Open-source authentication server offering full control and self-hosting. Rejected because operational burden of maintaining Keycloak detracts from product development, no major advantage over Clerk for current requirements, and Clerk's managed service is worth the vendor lock-in trade-off.
- **Amazon Cognito**: AWS authentication service, part of AWS ecosystem. Rejected because Cognito is more complex to set up than Clerk, pricing is less transparent, and the product is less developer-friendly. Clerk's experience is superior.
- **Custom Authentication**: Build user authentication in-house. Rejected because this introduces severe security risks (password storage, session management, OWASP compliance) and duplicates effort already solved by mature providers. Security is not a differentiator for KrewPact; use established solutions.

---

## ADR-006: Electronic Signature Provider (BoldSign)

**Status**: Accepted

### Context

KrewPact operates in construction, where contracts, change orders, and compliance documents require legally binding signatures. Manual e-signature collection is operationally expensive and error-prone. Construction workflows frequently involve:

- Subcontractor agreements
- Change order approvals
- Compliance certifications (safety training, background checks)
- Equipment rentals and liability waivers
- Customer proposals and project agreements

An e-signature provider must:

- Provide legally binding signatures recognized in jurisdictions where KrewPact operates
- Integrate cleanly with workflows (embedded signing, email invitations)
- Support templating and prefilled fields for repetitive documents
- Provide audit trails for compliance
- Offer competitive pricing at volume

### Decision

BoldSign (Syncfusion) has been selected as the e-signature provider. BoldSign is integrated via API, with document generation handled by the Node.js BFF and signing workflows initiated through embedded signing or email invitations. Documents requiring signatures are generated from templates stored in Supabase (document definitions) or S3 (document templates).

### Consequences

**Positive**:

- Legally binding signatures recognized in most jurisdictions, meeting construction industry requirements
- Syncfusion backing provides stability and active development
- Competitively priced; cost scales with documents signed, not per-user seats
- REST API integration with BFF simplifies document workflow management
- Embedded signing allows seamless in-app signing experience without leaving KrewPact
- Document templates and prefilled fields reduce manual entry and errors
- Comprehensive audit trails automatically capture signature details for compliance
- Support for multiple signature types (e-signature, digital signature with certificates) covers various requirements
- Webhook support allows KrewPact to react to signature events (send notifications, advance workflows)
- Cloud-hosted service eliminates infrastructure requirements

**Negative**:

- Integration requires managing document generation and template synchronization across systems
- API rate limiting may impact high-volume signing operations; requires queueing strategy
- Pricing becomes expensive if document volume is very high; cost per signature adds up
- Limited customization of signing experience; UI/UX is somewhat constrained
- Vendor dependency; switching providers requires document migration and template reconfiguration
- Webhook delivery is eventually consistent; real-time signing feedback requires polling or other workarounds
- Some advanced features (bulk sending, advanced routing) may require separate SKUs or negotiation
- Audit trail retrieval requires API calls; no bulk export mechanism for compliance reporting

### Alternatives Considered

- **DocuSign**: Market leader in e-signatures with extensive industry integration. Rejected because pricing is extremely high for small-to-medium document volumes, and BoldSign offers equivalent functionality at lower cost. DocuSign's enterprise features are overkill for KrewPact needs.
- **HelloSign (Dropbox Sign)**: Acquired by Dropbox, good API and embedded signing. Rejected because pricing is comparable to or higher than BoldSign, and Dropbox integration doesn't add value for KrewPact (no document collaboration needs at signature stage).
- **Adobe Sign**: Enterprise e-signature with PDF focus and strong mobile support. Rejected for similar reasons as DocuSign; pricing is high, and features are enterprise-oriented. KrewPact doesn't need the level of customization or support that justifies Adobe's cost.
- **Custom E-Signature Implementation**: Build signature verification and audit trails in-house. Rejected because e-signature legality involves complex jurisdictional considerations, implementing signature verification correctly is non-trivial, and liability is high if implemented incorrectly. Outsourcing to a specialized provider is prudent risk management.
- **Simple DOCX Stamping with Adobe Libraries**: Generate documents with signature stamps pre-placed, use Adobe's signing flow. Rejected because this doesn't meet legal binding requirements; signatures need cryptographic verification and timestamp services that specialized providers offer.

---

## ADR-007: Payroll Integration (ADP Workforce Now)

**Status**: Accepted

### Context

KrewPact manages construction crews and personnel, requiring integration with payroll systems for compensation, tax withholding, and compliance reporting. Payroll is highly regulated and varies by jurisdiction, so building custom payroll logic is infeasible. Instead, KrewPact must integrate with an existing payroll provider.

ADP Workforce Now is the dominant payroll platform in North America, particularly strong in construction and field service industries. Integration must:

- Synchronize employee master data (names, wages, tax withholding)
- Synchronize timekeeping data (hours worked, job assignments)
- Handle state and federal tax compliance reporting
- Support multiple pay frequency options (weekly, bi-weekly, monthly)
- Retrieve payroll data for integration into KrewPact financial reporting

### Decision

ADP Workforce Now has been selected as the payroll integration partner. Integration will be via ADP's REST API and Secure File Transfer (SFTP) for periodic data syncing. The Node.js BFF will orchestrate ADP API calls, with Supabase storing cached payroll data for reporting purposes.

**Partner Program Considerations**: ADP has a formal partner program requiring agreement to their terms, API access is gated behind partnership, and revenue-sharing arrangements may apply if KrewPact monetizes payroll integration directly. These terms are acceptable provided KrewPact uses ADP integration primarily to sync employee data, not as a white-label payroll offering.

### Consequences

**Positive**:

- ADP dominates the construction payroll market; most construction companies already use ADP, simplifying integration from customer perspective
- ADP's API is mature and well-documented; integration complexity is manageable
- Eliminates payroll processing from KrewPact scope; ADP handles tax compliance, regulatory changes, and reporting
- Reduces compliance liability; ADP is responsible for accurate tax withholding and reporting, not KrewPact
- Real-time data sync ensures KrewPact has current wage and tax information for financial reporting
- ADP's extensive employer customer base means solving ADP integration problems benefits many users
- Tax law changes are handled by ADP updates, not KrewPact; reduces ongoing maintenance burden
- Strong security for sensitive payroll data (SSN, tax IDs, wages) through ADP's encryption and compliance controls

**Negative**:

- ADP's partner program has contractual restrictions: API access requires partnership agreement, revenue-sharing may apply if payroll services are resold
- Integration lock-in: switching payroll providers requires significant integration rework
- API rate limiting and strict data access controls may require careful implementation to avoid throttling
- Payroll data is sensitive (wages, tax information); storing in Supabase requires extra care around encryption and access control
- ADP's API changes require coordination; breaking changes may require quick product updates
- Not all ADP Workforce Now customers have API access enabled; some customers may need to work with ADP to enable integrations
- Pricing: ADP integration may have associated fees through the partner program (though ADP integration itself is typically free)
- Data sync latency: Payroll data may not be real-time in KrewPact; data is batch-synced on a schedule

**Partner Program Considerations**:

The ADP partner program has specific restrictions that KrewPact must respect:

1. **API Access**: Integration requires agreeing to ADP's Integration Partner Agreement; API access is not available to general users but only to approved partners.

2. **Revenue-Sharing**: If KrewPact monetizes payroll integration directly (e.g., charging customers for payroll processing), ADP may require revenue-sharing or prohibit certain monetization models. This is acceptable provided KrewPact uses ADP integration primarily for data synchronization, not as a white-label payroll service.

3. **Data Handling**: ADP requires that partner systems implement specific security controls around payroll data (encryption, access control, audit logging). KrewPact must comply with these requirements in the Node.js BFF and Supabase layer.

4. **Compliance Documentation**: Partnerships require documenting security practices, compliance certifications, and data handling procedures. KrewPact should plan for audit or certification requirements.

### Alternatives Considered

- **Gusto (Gusto Embedded Payroll)**: Modern payroll platform with clean API, popular with startups. Rejected because ADP dominates the construction industry; most construction companies use ADP already, so KrewPact users would prefer ADP integration. Gusto is stronger in tech/startup spaces.
- **Paychex**: Another major US payroll provider with strong construction presence. Rejected because ADP is larger in construction, and API access is less developer-friendly than ADP. Integrating both is possible but adds complexity without benefit.
- **Custom Payroll Processing**: Build payroll logic in-house, integrate with tax filing services. Rejected because payroll is highly regulated, and errors have legal and financial consequences for employers. Outsourcing payroll to established providers is essential for risk mitigation and compliance.
- **Square Payroll or Stripe Payroll**: Newer entrants with simpler integration. Rejected because these services don't have meaningful penetration in construction; most construction customers use ADP or Paychex, making integration less valuable.
- **Time and Attendance Only**: Integrate with time-tracking system (like Deputy or When I Work), then manually sync to payroll. Rejected because manual sync is error-prone, and KrewPact goals include reducing manual workarounds. Direct ADP integration is cleaner.

---

## ADR-008: File Storage Strategy

**Status**: Accepted

### Context

KrewPact requires file storage for:

- Construction documents (blueprints, specifications, permits)
- Compliance records (certifications, training records, background checks)
- Project photos and evidence
- Signed contracts and change orders (generated by BoldSign)
- Crew profiles and personnel documentation
- Financial documents (invoices, receipts, financial statements)

File storage must:

- Support large file sizes (blueprints can be 50+ MB)
- Provide secure access control aligned with tenant/division structure
- Support efficient downloads from field environments
- Enable direct uploads from mobile/web clients
- Scale to handle growing document volume
- Integrate with audit logging for compliance

Local storage on Proxmox is not viable for multi-tenant platform (data isolation, backup complexity, operational management). Cloud storage is necessary.

### Decision

S3-compatible file storage will be used, with implementation details deferred based on operational evaluation. The two leading options are:

1. **Supabase Storage** (recommended initial choice): Built on AWS S3, managed by Supabase team, integrated with Supabase authentication and Row-Level Security policies.

2. **Cloudflare R2**: S3-compatible storage, significantly cheaper than AWS S3 (no egress charges), excellent for high-bandwidth scenarios.

The BFF will handle file upload/download orchestration, enforcing access control through authorization checks before permitting access to files. Presigned URLs or temporary credentials will be issued to clients, allowing direct uploads/downloads without proxying through the BFF (reducing bandwidth costs and latency).

### Consequences

**Positive**:

- S3-compatible interface provides standardized API, enabling migration between providers if needed
- Supabase Storage integration with Row-Level Security provides database-level security synchronization
- Presigned URLs enable direct client uploads/downloads, reducing BFF bandwidth and latency
- Automatic encryption at rest and in transit meets security requirements
- Versioning and lifecycle policies enable retention/deletion compliance
- Durability (99.999999999%) and redundancy eliminate data loss risks
- Scalable to petabyte-scale data volume without performance degradation
- Cost is predictable and transparent, scaling with actual usage

**Negative**:

- Egress charges (especially with Supabase Storage using AWS S3) can be expensive if users download large files frequently
- Access control requires careful integration of authorization logic with storage layer
- Compliance with data residency requirements: if using AWS S3 (Supabase Storage), data is not Canadian-resident
- Client-side uploads/downloads require presigned URLs, introducing temporary credential management complexity
- Storage is eventually consistent; immediate read-after-write consistency is not guaranteed (though rare issue in practice)
- Lifecycle policies (auto-deletion of old versions) require careful configuration to avoid accidental data loss
- File structure (flat key/value model) doesn't map directly to hierarchical filesystem; applications must implement hierarchy logic

**Supabase Storage vs. Cloudflare R2 Trade-off**:

- **Supabase Storage**: Integrated with Supabase ecosystem, Row-Level Security policies, straightforward multi-tenant access control. Costs more due to AWS S3 egress charges, but operational simplicity is worth it initially.
- **Cloudflare R2**: Significantly cheaper due to no egress charges; better for bandwidth-heavy scenarios. Requires separate access control implementation (not integrated with database), adding complexity. Evaluate after proving product-market fit and understanding real usage patterns.

### Alternatives Considered

- **AWS S3 Directly**: Direct S3 integration without Supabase wrapper. Rejected because it decouples storage from database, making access control more complex. Supabase's integration simplifies this.
- **MinIO (self-hosted S3-compatible storage)**: Self-hosted S3-compatible server on Proxmox. Rejected because operational burden of managing MinIO (backups, high availability, monitoring) detracts from product development. Managed services are worth the cost.
- **Google Cloud Storage or Azure Blob Storage**: Cloud alternatives to S3. Rejected because S3 is the industry standard, and maintaining proprietary API integrations (instead of S3-compatible) limits flexibility. Stick with S3 compatibility.
- **Local filesystem on Proxmox with NFS**: Store files on Proxmox directly. Rejected because this doesn't scale to multi-instance deployments, backup complexity is high, and disaster recovery is difficult. Cloud storage provides these benefits automatically.
- **IPFS or Decentralized Storage**: Eliminate central storage provider. Rejected because decentralized storage adds complexity (IPFS node management, content addressing), reduces performance (IPFS retrieval is slower), and doesn't provide access control necessary for multi-tenant compliance.

---

## ADR-009: Job Queue and Background Processing

**Status**: Tentative (decision deferred pending implementation)

### Context

KrewPact has asynchronous work that cannot be handled in the request-response cycle:

- Generating reports (PDF exports of projects, financial statements)
- Synchronizing data with ADP and ERPNext (scheduled jobs, potentially triggered by events)
- Sending email notifications (onboarding, alerts, digest summaries)
- Processing uploaded documents (OCR, document classification)
- Importing data from external sources (CSV uploads, API integrations)
- Long-running calculations (payroll reconciliation, financial consolidation across divisions)
- File transcoding (image optimization, video processing if construction documentation includes video)

These jobs require:

- Durability: jobs must not be lost if the application crashes
- Retry logic: failed jobs should be retried with exponential backoff
- Scheduling: some jobs run on fixed schedules (daily financial reconciliation)
- Monitoring: visibility into job success/failure rates
- Scalability: job processing should scale independently from the API tier

### Decision

Job queue selection is deferred pending implementation experience. Three candidates are under evaluation:

1. **BullMQ**: Node.js job queue using Redis, mature ecosystem, excellent documentation. Suitable for most use cases; requires managing Redis infrastructure.

2. **Inngest**: Serverless job queue and workflow platform, no infrastructure management, built-in dashboard and monitoring, generous free tier. Recommended for early-stage product.

3. **Supabase pg_cron**: PostgreSQL native job scheduling using cron expressions, no external infrastructure. Suitable for simple scheduled jobs, limited for event-driven work.

**Tentative Recommendation**: Start with **Supabase pg_cron** for scheduled jobs (financial reconciliation, ADP sync) and **Inngest** for event-driven work (notifications, document processing). This hybrid approach minimizes infrastructure management while supporting both scheduling and event-driven patterns. As workload complexity grows, evaluate migrating to BullMQ if Inngest becomes a bottleneck or cost concern.

### Consequences

**BullMQ**:

**Positive**:

- Extremely flexible; supports any job pattern (scheduled, delayed, event-driven, recurring)
- Mature ecosystem with extensive community solutions and third-party integrations
- Excellent monitoring capabilities through web dashboard (Bull Board)
- Full control over job retry logic and error handling
- No vendor lock-in; can be self-hosted or used with managed Redis providers

**Negative**:

- Requires operational management of Redis infrastructure (monitoring, backups, high availability)
- Adds operational complexity with another service to maintain and scale
- Learning curve for distributed job processing concepts (job idempotency, failure handling)
- Self-hosting Redis on Proxmox adds infrastructure management burden

**Inngest**:

**Positive**:

- Serverless; no infrastructure management required
- Built-in dashboard and monitoring superior to most alternatives
- Generous free tier allows significant usage without costs
- Excellent developer experience; straightforward APIs and SDK
- Scales automatically; no capacity planning needed
- Built-in retry logic, exponential backoff, and error handling
- Deep integration with framework SDKs (Next.js, Express)

**Negative**:

- Vendor lock-in; migrating away from Inngest requires rewriting job definitions
- Pricing transparency unclear at high volume; cost may become significant
- Limited visibility into job internals; debugging jobs is less transparent than self-hosted solutions
- Rate limiting and quota restrictions may constrain high-frequency job processing

**Supabase pg_cron**:

**Positive**:

- No external infrastructure; runs directly in PostgreSQL
- Seamless integration with Supabase; same connection and authentication
- Simple for scheduled jobs; cron expression syntax is familiar
- Minimal operational overhead

**Negative**:

- Limited to scheduled jobs; not well-suited for event-driven work
- Cannot handle complex job workflows (dependencies, conditional branching)
- Job code must be in PostgreSQL (PL/pgSQL) or trigger external webhooks; awkward for Node.js-based jobs
- Less mature tooling for monitoring and debugging job execution
- Not ideal for jobs that require significant compute resources

### Alternatives Considered

- **AWS SQS + Lambda**: Serverless job processing through AWS. Rejected because it locks into AWS ecosystem, and managing Lambda function deployments adds complexity. For a self-hosted product, it's less suitable.
- **Celery (Python-based)**: Industry-standard for Python job queues. Rejected because KrewPact backend is Node.js; adding Python service introduces polyglot complexity without clear benefit.
- **RabbitMQ**: Message broker for job processing. Rejected because it's more complex to set up than BullMQ or Inngest, and doesn't provide as much out-of-the-box functionality for job management (retries, scheduling).
- **Custom HTTP Webhooks**: Trigger jobs via HTTP callbacks. Rejected because this lacks durability, retry logic, and monitoring; too fragile for production use.

---

## ADR-010: Frontend Hosting (Vercel)

**Status**: Accepted

### Context

The Next.js frontend must be deployed to a publicly accessible environment. Deployment must:

- Provide HTTPS with automatic certificate management
- Support preview deployments for testing pull requests
- Enable continuous integration/continuous deployment (CI/CD)
- Provide CDN distribution for global performance
- Offer analytics and error tracking
- Scale seamlessly as user traffic grows
- Integrate well with GitHub for git-based deployments

### Decision

Vercel (created by the Next.js team) has been selected for frontend hosting. Vercel provides native Next.js optimization, automatic deployments from GitHub, built-in edge network, and straightforward configuration.

### Consequences

**Positive**:

- Vercel is optimized for Next.js; deployment and performance are superior to generic hosting
- GitHub integration enables preview deployments on every pull request, simplifying code review
- Automatic HTTPS with certificate management eliminates security infrastructure burden
- Edge Network provides global CDN, ensuring fast content delivery regardless of user location
- Automatic caching and compression optimize bandwidth usage
- Built-in error reporting and performance analytics provide visibility into frontend health
- Generous free tier allows development and early-stage product without infrastructure costs
- Vercel scales automatically; no capacity planning or load balancer management needed
- Environment variable management is straightforward; secrets can be encrypted and stored securely
- Built-in Vercel Analytics integration provides performance monitoring and Core Web Vitals tracking

**Negative**:

- Vendor lock-in: migrating to another host requires infrastructure changes
- Pricing scales with bandwidth and compute; high-traffic deployments can become expensive
- Limited control over infrastructure; cannot install custom system packages or heavily customize deployment environment
- Cold starts for serverless functions (API routes run on Lambda); latency-sensitive operations may be impacted
- Regional data residency limitations: Vercel uses US infrastructure; non-US data residency is not available
- Edge Functions have latency limits and regional limitations
- Custom domains and DNS management add operational overhead if using custom domains
- Limited advanced customization; some enterprise deployment patterns are unsupported

### Alternatives Considered

- **Self-Hosting on Proxmox**: Host Next.js directly on self-managed infrastructure. Rejected because it introduces operational complexity (load balancing, certificate renewal, infrastructure monitoring), distracts from product development, and doesn't provide the same global CDN benefits. Vercel's benefits are worth the vendor lock-in.
- **Netlify**: Alternative Next.js hosting with similar feature set. Rejected because Vercel is created by the Next.js team and offers superior optimization and integration. Performance and developer experience are better with Vercel.
- **AWS Amplify**: AWS's web hosting platform. Rejected because it's more complex to set up and configure than Vercel, pricing is less transparent, and documentation is not as developer-friendly. Vercel is the better choice for rapid iteration.
- **GitHub Pages**: Free static hosting through GitHub. Rejected because it doesn't support Next.js server-side rendering and API routes; GitHub Pages is for static sites only. KrewPact requires dynamic server-side functionality.
- **Google Firebase Hosting**: Google's web hosting platform. Rejected because it's less optimized for Next.js compared to Vercel, and doesn't provide the same level of integration and analytics.

---

## ADR-011: ERPNext and Backend Hosting (Self-Hosted - Proxmox)

**Status**: Accepted

### Context

ERPNext is a stateful application requiring persistent storage, database connections, and long-running processes. The Node.js BFF needs similar infrastructure. Self-hosting provides control over data, infrastructure, and customization, but requires operational management.

The founder operates Proxmox (hypervisor) with ZFS storage, GPU passthrough capabilities, and containerized workloads on Debian/Ubuntu Linux. This infrastructure can serve as the hosting platform for both ERPNext and the BFF.

### Decision

ERPNext and the Node.js BFF will be deployed as containerized applications on Proxmox using Docker, with the following architecture:

- **Virtualization**: Proxmox hosts virtual machines or LXC containers for application deployment
- **Storage**: ZFS storage pool on Proxmox provides data durability, snapshots, and backup capabilities
- **Networking**: Tailscale overlay network provides secure inter-service communication between Proxmox services and Vercel frontend
- **Reverse Proxy**: Nginx Proxy Manager provides HTTPS termination, request routing, and basic load balancing
- **Monitoring**: TBD (see ADR-024) for visibility into application health and resource utilization

Deployment automation (Docker Compose or Kubernetes) will be used to manage multi-container deployments and simplify updates.

### Consequences

**Positive**:

- Complete control over infrastructure; infrastructure choices can be optimized for cost and performance
- Data remains on-premises; improved compliance with data residency and privacy requirements
- No vendor lock-in; infrastructure can be migrated to alternative providers if needed
- ZFS provides excellent backup, snapshot, and recovery capabilities for disaster recovery
- GPU passthrough enables future compute-intensive workloads (OCR, image processing)
- Cost is predictable; no egress charges, no per-instance licensing fees
- All data is accessible for auditing and compliance purposes
- Flexibility to customize infrastructure for specific requirements (resource allocation, network topology)
- Isolation between environment (dev/staging/production) through separate VMs/containers

**Negative**:

- Operational burden falls on the founder: monitoring, patching, backup, disaster recovery, capacity planning
- Initial infrastructure setup requires time and expertise; not suitable for founders without infrastructure experience
- Hardware failures are possible; infrastructure must be designed with redundancy (though single-node is acceptable initially)
- Scaling horizontally (adding more servers) requires additional capital expenditure
- Backup management is manual; requires discipline to maintain reliable backups
- Security updates (OS patches, application updates) must be managed proactively
- Monitoring and alerting require custom setup; not as mature as managed services
- Connectivity and networking issues are more likely than with cloud providers; requires network expertise
- Power and cooling infrastructure must be reliable; downtime impacts all services

**Proxmox Specific Considerations**:

The founder's Proxmox setup provides significant advantages for self-hosting:

1. **Hypervisor**: Proxmox provides robust virtualization for isolated environments and easy recovery from failures.

2. **ZFS Storage**: ZFS's copy-on-write semantics enable efficient snapshots, clones, and compression. This is particularly valuable for:
   - Daily snapshots of databases for quick recovery
   - Clone-based testing environments
   - Compression reducing storage capacity requirements
   - Data integrity verification through checksums

3. **GPU Passthrough**: Enables future compute-intensive workloads (image processing, OCR) without separate GPU hardware.

4. **Container Support**: Proxmox supports Docker containers and LXC containers, enabling efficient deployment and resource isolation.

### Alternatives Considered

- **AWS EC2 (managed compute)**: Migrate to AWS for professional hosting. Rejected because it increases costs, moves away from on-premises infrastructure benefits, and introduces vendor lock-in. Proxmox provides the flexibility needed.
- **Hetzner Dedicated Servers**: Managed dedicated servers in Europe. Rejected because founder's Proxmox is already operational, and switching introduces unnecessary migration burden. Hetzner is suitable as a future migration path if self-hosting becomes untenable.
- **DigitalOcean App Platform**: Simple managed Kubernetes-like platform. Rejected because it's expensive for the workload size, and doesn't provide the storage and compute customization available on Proxmox.
- **Heroku**: Platform-as-a-Service for application deployment. Rejected because it's extremely expensive for 24/7 applications, limited customization, and vendor lock-in is severe. Proxmox offers better economics.
- **Managed Kubernetes (EKS, GKE)**: Container orchestration platforms. Rejected because operational complexity of Kubernetes is unjustified at this scale. Proxmox with Docker Compose provides sufficient orchestration without Kubernetes overhead.

---

## ADR-012: Inter-Service Networking (Tailscale)

**Status**: Accepted

### Context

KrewPact architecture includes multiple services across different infrastructure:

- Vercel-hosted Next.js frontend
- Proxmox-hosted Node.js BFF
- Proxmox-hosted ERPNext instance
- Supabase PostgreSQL database
- Supabase Storage
- Third-party APIs (ADP, BoldSign)

Services need secure, low-latency communication. Public internet routing exposes services to attack surface; services should not be publicly accessible except where necessary (e.g., frontend). A private network overlay would:

- Encrypt inter-service traffic automatically
- Enable services to communicate using private IP addresses
- Provide network isolation from the public internet
- Simplify firewall rules (services authorize peers, not ports)
- Enable services to move without DNS/IP updates
- Support mobile and remote deployments in the future

### Decision

Tailscale has been selected as the overlay network provider. Tailscale creates a secure mesh network over the public internet, encrypting traffic and enabling peer-to-peer communication.

Deployment:

- **Frontend (Vercel)**: Tailscale client runs in a helper environment or via Next.js middleware, enabling frontend to reach backend via Tailscale private IP.
- **BFF and ERPNext (Proxmox)**: Tailscale installed on Proxmox VMs/containers, enabling backend services to reach each other and the database via private Tailscale addresses.
- **Supabase**: Connected to Tailscale via a relay node or VPN integration, enabling private database access.

Authorization is managed through Tailscale's access control lists (ACLs), defining which services can communicate with which peers.

### Consequences

**Positive**:

- Automatic encryption of inter-service traffic eliminates need for manual TLS/mTLS setup
- Mesh network topology eliminates central load balancer/gateway as a single point of failure
- Private IP routing keeps services off the public internet, reducing attack surface
- Peer-to-peer communication is low-latency; no additional hops through a central proxy
- ACLs provide fine-grained access control without firewall rules
- Services can be added to the network without modifying infrastructure
- Mobile/remote deployments are supported; field operations can access services securely
- Tailscale's WireGuard-based VPN is performant; encryption overhead is minimal
- No dedicated infrastructure for VPN; Tailscale is managed by Tailscale Inc.
- Split DNS enables accessing Tailscale devices by name (e.g., bff.internal.krewpact)

**Negative**:

- Vendor dependency: Tailscale control plane is proprietary; cannot self-host (free tier only)
- Network complexity increases; debugging network connectivity issues requires Tailscale knowledge
- Latency overhead is minimal but not zero; encrypted tunnel adds microseconds to packet transit
- Free tier has limitations on device count and features; paid plan is required for production use
- Tailscale exit nodes (for public internet access) add complexity to network topology
- ACLs can become complex with many services; managing access policies requires discipline
- Split DNS configuration requires careful setup to avoid leaking internal names to ISP or client resolver
- Tailscale client needs to be installed and managed on every device/container that joins the network
- Integration with Supabase may be indirect (relay node, VPN), adding complexity

### Alternatives Considered

- **WireGuard (self-hosted)**: Open-source VPN protocol, self-hosted configuration. Rejected because managing WireGuard peers manually is operationally complex, and Tailscale's managed service and UI simplify peer management.
- **OpenVPN**: Traditional VPN, self-hosted capability. Rejected because OpenVPN is more complex to configure than WireGuard, performance is lower, and Tailscale's modern approach is superior.
- **AWS VPC Peering or Private Link**: AWS networking for inter-service communication. Rejected because KrewPact is not fully on AWS (Vercel, Supabase, Proxmox self-hosted); AWS peering doesn't work with non-AWS services.
- **ZeroTier**: Alternative overlay network provider similar to Tailscale. Rejected because Tailscale has stronger market presence, better documentation, and superior mobile support.
- **No Overlay Network**: Services communicate over the public internet. Rejected because unencrypted inter-service traffic is a security risk, and BFF should not be publicly accessible except through reverse proxy.

---

## ADR-013: Reverse Proxy (Nginx Proxy Manager)

**Status**: Accepted

### Context

The Node.js BFF and other Proxmox-hosted services need to be accessible from the Vercel frontend and mobile clients. However, these services should not listen on public internet addresses; they should be accessible only through a reverse proxy that:

- Terminates HTTPS and handles certificate management
- Routes requests to the correct backend service
- Enforces authentication and authorization policies
- Limits request rates to prevent abuse
- Logs access for compliance and debugging
- Caches responses to reduce backend load

### Decision

Nginx Proxy Manager has been selected as the reverse proxy. Nginx Proxy Manager is a Docker-based UI for managing Nginx configurations, simplifying reverse proxy setup without manual Nginx config files.

Deployment:

- Nginx Proxy Manager runs as a Docker container on Proxmox
- SSL certificates are provisioned via Let's Encrypt, with automatic renewal
- Access to the Nginx Proxy Manager UI is restricted to administrator access (SSH tunnel or Tailscale)
- Backend services listen on private Tailscale IP addresses; Nginx routes traffic to these private IPs
- Request logging is enabled for debugging and compliance

### Consequences

**Positive**:

- Simplifies Nginx management through a web UI rather than manual configuration
- Let's Encrypt integration provides automatic certificate provisioning and renewal
- No manual TLS/mTLS management for inter-proxy communication
- Request logging provides visibility into traffic patterns and errors
- Gzip compression reduces response sizes automatically
- Basic rate limiting prevents abuse and DoS attacks
- Caching of static responses reduces backend load
- Health checks detect backend failures and take services out of rotation
- Supports multiple backend services with path-based or host-based routing
- Can be deployed on Proxmox alongside other services

**Negative**:

- Nginx Proxy Manager UI requires securing separately (SSH tunnel, Tailscale access)
- Configuration is stored in Docker; backing up configuration requires backing up Docker volumes
- Nginx Proxy Manager updates may require recreation of the container; configuration should be version-controlled
- Advanced Nginx features (Lua scripting, custom modules) are not accessible through the UI; requires manual config editing
- Single instance is a single point of failure for all backend services; requires HA setup for production
- Learning curve for operators unfamiliar with reverse proxy concepts
- Monitoring and alerting for Nginx Proxy Manager must be configured separately

### Alternatives Considered

- **Manual Nginx Configuration**: Run Nginx directly without UI. Rejected because managing Nginx config files manually is error-prone, and the UI simplifies common operations (SSL cert renewal, adding new routes).
- **Traefik**: Modern reverse proxy with Docker integration and automatic certificate management. Rejected because Traefik is more complex to configure than Nginx Proxy Manager for simple use cases, and Nginx is more mature and well-documented.
- **Caddy**: Modern reverse proxy with built-in HTTPS support. Rejected because Caddy is less configurable than Nginx for advanced use cases, and Nginx has wider industry adoption.
- **HAProxy**: Lightweight load balancer and reverse proxy. Rejected because HAProxy is lower-level than Nginx Proxy Manager; management UI would still need to be built, and Nginx is more commonly used.
- **Kubernetes Ingress**: Use Kubernetes for reverse proxy and routing. Rejected because Kubernetes is overkill for the service scale; Docker Compose + Nginx Proxy Manager is simpler and requires less operational knowledge.

---

## ADR-014: CI/CD Pipeline (GitHub Actions)

**Status**: Accepted

### Context

KrewPact has multiple codebases that need automated testing, building, and deployment:

- Next.js frontend
- Node.js BFF
- Potentially custom ERPNext modules

CI/CD must:

- Run on every push and pull request
- Execute unit and integration tests
- Lint code and enforce code quality standards
- Build Docker images for backend services
- Deploy frontend changes to Vercel automatically
- Deploy backend changes to Proxmox automatically
- Report build and deployment status

### Decision

GitHub Actions has been selected for CI/CD. GitHub Actions integrates natively with GitHub repositories, eliminating the need for external CI/CD platforms.

Workflows will:

- Run tests and linting on every push and PR
- Build and tag Docker images for backend services
- Deploy frontend to Vercel on merge to main branch
- Deploy backend to Proxmox (via docker-compose or direct deployment) on merge to main branch
- Provide deployment notifications and logs

### Consequences

**Positive**:

- Native GitHub integration; no external platform to manage
- Generous free tier; sufficient for early-stage product development
- Straightforward YAML configuration; workflows are readable and maintainable
- Built-in secrets management for API keys and deployment credentials
- Matrix builds enable testing across multiple Node versions automatically
- Caching of dependencies speeds up workflow execution
- Pull request checks provide immediate feedback to developers
- No additional infrastructure required; runs on GitHub's infrastructure
- Extensive community actions available for common tasks (Docker build, Vercel deploy, notifications)

**Negative**:

- Workflow execution can queue if many pipelines are running; may slow down deployment during high activity
- Limited control over runtime environment; custom dependencies must be installed at workflow runtime
- Debugging failed workflows requires examining logs; not as interactive as local development
- Secrets are stored as environment variables, increasing risk of accidental exposure if logs are shared
- Large dependencies or complex builds may hit GitHub's free tier time limits (if applicable)
- Vendor lock-in: migrating to another CI/CD platform requires rewriting workflows
- Learning curve for YAML syntax and GitHub Actions concepts
- Limited native support for complex deployment orchestration; complex deploys require custom scripts

### Alternatives Considered

- **GitLab CI/CD**: Native CI/CD integrated with GitLab repositories. Rejected because KrewPact uses GitHub (not GitLab), and migrating repositories would introduce unnecessary overhead. GitHub Actions is sufficient.
- **CircleCI**: Cloud-based CI/CD platform. Rejected because GitHub Actions provides the same features with simpler integration (no external platform to manage), and pricing is similar.
- **Jenkins**: Self-hosted CI/CD platform. Rejected because operational burden of maintaining Jenkins (updates, security patches, monitoring) detracts from product development. Managed solutions are worth the vendor lock-in.
- **Buildkite**: Lightweight CI/CD platform. Rejected because GitHub Actions provides sufficient features, and external CI/CD introduces operational complexity.
- **Travis CI or AppVeyor**: Older CI/CD platforms. Rejected because these are being deprecated/consolidated; GitHub Actions is the modern choice.

---

## ADR-015: State Management (Frontend)

**Status**: Proposed (implementation approach deferred)

### Context

The Next.js frontend must manage client-side state for:

- User authentication and session information
- Current user's tenant and division context
- Sidebar navigation and UI state (collapsed/expanded)
- Form state and validation errors
- Cached data from the BFF (projects, financials, crew data)
- Real-time data subscriptions (live project updates)
- Modal and dialog visibility
- Theme and user preferences

State management approaches vary in complexity:

- React Context API: built-in, lightweight, sufficient for simple state
- Redux: comprehensive, mature, opinionated, heavy boilerplate
- Zustand: lightweight, intuitive, good for small-to-medium applications
- Tanstack Query: optimized for server state and data synchronization
- Jotai or Recoil: modern atomic state management

### Decision

**TBD - Deferred to implementation phase**.

Recommendation: Use a combination of tools rather than a single state management library:

1. **React Context API + useReducer**: For authentication state, user context (tenant, division, permissions)
2. **Tanstack Query (React Query)**: For server state, caching BFF responses, automatic synchronization
3. **Local Storage + useEffect**: For UI state (sidebar collapse, preferences), persisting across sessions
4. **Zustand (if needed)**: For complex UI state that doesn't map well to Context or Tanstack Query

This layered approach avoids over-engineering state management early on while providing a clear path to scale as complexity grows.

### Consequences

**Context + Tanstack Query Approach**:

**Positive**:

- Tanstack Query handles the common pattern of fetching and caching server data, eliminating custom fetching logic
- React Context is built-in; no external dependencies for simple state
- Zustand can be added later if complex UI state becomes unwieldy
- Avoids heavy boilerplate of Redux early on; scales with complexity
- Tanstack Query's stale-while-revalidate pattern improves perceived performance
- Automatic request deduplication in Tanstack Query prevents redundant API calls
- DevTools available for both Tanstack Query and Zustand (if added) for debugging

**Negative**:

- Multiple libraries mean developers must understand different state management patterns
- Tanstack Query has a learning curve; mutation and invalidation logic requires understanding
- Context API re-renders can be inefficient if state is updated frequently; may require refactoring
- Zustand (if added later) introduces another library; long-term maintenance of multiple approaches

### Alternatives Considered

- **Redux Toolkit**: Industry standard with extensive documentation and tooling. Rejected because Redux's boilerplate is excessive for early-stage product; Tanstack Query + Context is simpler initially, with a migration path to Redux if needed.
- **MobX**: Reactive state management with decorators. Rejected because MobX has a smaller ecosystem and weaker TypeScript support compared to Zustand or Tanstack Query.
- **Unstated Next**: Lightweight Context wrapper. Rejected because Tanstack Query is more purposeful for the common pattern of server state management.
- **Custom Hooks**: Manage state entirely through custom React hooks. Rejected because this approach doesn't scale beyond a few pieces of shared state; Tanstack Query and Context provide more structure.

---

## ADR-016: API Design (REST vs GraphQL vs tRPC)

**Status**: Accepted (REST with REST Query Parameters)

### Context

The Node.js BFF must expose APIs that the Next.js frontend consumes. API design choices impact:

- Developer productivity (query simplicity, fewer network roundtrips)
- Over-fetching and under-fetching of data
- Caching strategy (HTTP caching vs client-side caching)
- Monitoring and debugging visibility
- Documentation and client generation
- Type safety between frontend and backend

### Decision

REST API with REST query parameters for filtering, sorting, and pagination has been selected. The BFF will expose endpoints following REST conventions:

- `GET /api/projects` - list all projects (paginated)
- `GET /api/projects/:id` - fetch single project
- `POST /api/projects` - create new project
- `PUT /api/projects/:id` - update project
- `DELETE /api/projects/:id` - delete project

Query parameters support filtering and pagination:

- `GET /api/projects?division_id=123&status=active&page=1&limit=50`
- `GET /api/projects/:id?include=financials,tasks` (include related data to reduce roundtrips)

Responses follow a consistent envelope format:

```json
{
  "data": {
    /* resource or array of resources */
  },
  "meta": { "page": 1, "limit": 50, "total": 200 },
  "errors": [
    /* validation errors or warnings */
  ]
}
```

Tanstack Query (React Query) on the frontend handles caching, deduplication, and cache invalidation.

### Consequences

**Positive**:

- REST is industry standard; widely understood by developers
- HTTP caching works well with REST; browser and CDN caching can reduce backend load
- Easy to debug; REST endpoints can be tested with curl or Postman
- OpenAPI documentation can be auto-generated, improving developer experience
- HTTP status codes have semantic meaning; errors are standard
- Simple filtering and sorting via query parameters are easy to implement and understand
- No learning curve; standard HTTP knowledge is sufficient
- Versioning is straightforward (v1, v2 in URL path)

**Negative**:

- Over-fetching: clients may receive more data than needed (though `include` parameter mitigates this)
- Under-fetching: clients may need multiple roundtrips to fetch related data (though `include` mitigates this)
- N+1 problem: fetching a list of projects and then their tasks requires N+1 requests without careful design
- Pagination is required for large datasets; clients must implement pagination logic
- URL length limits restrict complex filtering with many parameters
- Caching complexity: cache invalidation is challenging when multiple endpoints return overlapping data
- No automatic type generation; frontend must maintain manual type definitions (though OpenAPI tools help)

**Query Parameter Filtering Design**:

The API will support a flexible filtering syntax:

- `GET /api/projects?division_id=123` - exact match
- `GET /api/projects?status[in]=active,completed` - array match
- `GET /api/projects?budget[gt]=10000` - greater than
- `GET /api/projects?created_at[gte]=2025-01-01` - date range
- `GET /api/projects?search=Office%20Renovation` - full-text search

This avoids GraphQL complexity while providing reasonable querying flexibility.

### Alternatives Considered

- **GraphQL**: Query language enabling clients to request exactly the data they need. Rejected because GraphQL's learning curve is steeper, query complexity can hide N+1 problems, and caching is more difficult. For KrewPact's data model, REST with `include` parameters provides sufficient flexibility without GraphQL's complexity.
- **tRPC**: TypeScript RPC framework enabling full-stack type safety. Rejected because tRPC couples frontend and backend strongly (must share TypeScript types), making future API versioning and independent deployment more difficult. REST provides loose coupling.
- **gRPC**: High-performance RPC framework. Rejected because gRPC requires HTTP/2 and protobuf definitions, adding complexity. REST is sufficient for KrewPact performance needs.
- **OData**: Query language for REST APIs. Rejected because OData's query syntax is complex, and simpler REST query parameters are sufficient.

---

## ADR-017: Real-Time Updates Strategy

**Status**: Accepted

### Context

KrewPact has features requiring real-time updates:

- Live project status changes (task completions, status updates)
- Real-time crew availability and location (for field management)
- Financial data updates (invoice changes, payment tracking)
- Notification delivery (system alerts, approvals)
- Collaborative editing (multiple users viewing same project)

Real-time updates must:

- Have low latency (<1 second for most use cases)
- Scale to support many concurrent users
- Be reliable; messages should not be lost
- Reduce server load compared to polling
- Work across network boundaries (Vercel frontend to Proxmox backend)

### Decision

Real-time updates will be implemented using a multi-strategy approach:

1. **Supabase Realtime (Recommended)**: PostgreSQL change data capture (CDC) via `LISTEN/NOTIFY`. Supabase exposes this via a WebSocket API. The frontend subscribes to specific tables and receives updates automatically when database rows change.

2. **Server-Sent Events (SSE)**: For simpler, one-way updates (notifications, alerts), SSE over HTTPS is simpler than WebSocket and integrates cleanly with REST API.

3. **Polling with Exponential Backoff**: For clients with unreliable connectivity (mobile in poor network conditions), polling with exponential backoff and cache awareness can supplement WebSocket/SSE.

Initial implementation will use Supabase Realtime for critical data (projects, tasks) and SSE for notifications. This avoids maintaining a separate WebSocket server while leveraging Supabase's built-in capabilities.

### Consequences

**Supabase Realtime**:

**Positive**:

- Automatic; database changes trigger subscriptions without application logic
- Low latency; change is transmitted immediately upon database commit
- Scales to many concurrent subscribers
- Leverages Supabase infrastructure; no additional server required
- Row-level security policies automatically filter what each user sees
- Efficient bandwidth; only changed rows are transmitted

**Negative**:

- Latency is ultimately limited by network; <1 second typical, but not guaranteed <100ms
- Supabase Realtime has connection limits; high-frequency subscriptions may hit rate limits
- Network failures require client-side reconnection logic
- Difficult to guarantee message delivery for critical updates; eventually consistent model
- Debugging issues requires understanding Supabase's CDC implementation

**Server-Sent Events**:

**Positive**:

- Simpler than WebSocket; uses HTTP protocol with long-polling underneath
- One-way communication is sufficient for notifications
- Browser support is excellent; no special libraries needed (though libraries simplify handling)
- Integrates naturally with REST API; endpoint can serve both data and events

**Negative**:

- One-way only; cannot send updates from client to server
- Reconnection is automatic but may have delays
- Browser connection limits (max 6 concurrent connections per domain) can be limiting

### Alternatives Considered

- **Custom WebSocket Server**: Build a dedicated WebSocket server for real-time updates. Rejected because this adds operational complexity (another service to monitor and scale), and Supabase Realtime provides sufficient functionality without the overhead.
- **Socket.IO**: Popular WebSocket library with fallback support. Rejected because it requires a custom WebSocket server, and Supabase Realtime is simpler to implement.
- **Firebase Realtime Database**: Google's real-time database. Rejected because KrewPact uses Supabase, not Firebase; adding another Google service increases vendor lock-in.
- **Polling Only**: Clients poll the backend periodically for updates. Rejected because polling is inefficient, uses more bandwidth, and introduces latency compared to push-based updates.
- **Message Broker (RabbitMQ, Kafka)**: Reliable message distribution. Rejected because Supabase Realtime already handles distribution, and adding a message broker increases operational complexity.

---

## ADR-018: Offline-First Architecture for Field Operations

**Status**: Proposed (deferred to later product phase)

### Context

Construction field operations frequently encounter poor network connectivity: tunnels, rural areas, basement work, etc. Users in the field should be able to:

- View projects, tasks, and crew information offline
- Update task status and log work hours offline
- View financial data and contracts offline
- Sync changes when connectivity is restored

Building offline-first architecture requires:

- Client-side data storage (IndexedDB, SQLite)
- Conflict resolution for concurrent edits
- Sync strategy for uploading changes
- UI indicating offline mode and sync status

Full offline-first implementation is complex and is deferred to a later product phase when usage patterns are better understood.

### Decision

Offline-first capabilities will be deferred to Phase 2 of product development. Initial phase assumes generally available connectivity for construction sites.

For future implementation, **Watermelon DB** is the recommended library: it's designed specifically for offline-first React applications, handles synchronization automatically, and provides conflict resolution.

When implemented, offline-first will:

- Use Watermelon DB for local storage on mobile and desktop
- Sync layer will be implemented in the BFF, tracking user changes and resolving conflicts
- Optimistic updates in the UI show changes immediately even while offline
- Conflicts are detected during sync; users are notified and guided through resolution

### Consequences

**Phase 1 (Current): No Offline Support**

**Positive**:

- Simplifies initial development; focus on core features
- Reduces client-side complexity
- Assumes connectivity (reasonable for construction sites with planning)
- Can gather real usage patterns before investing in offline infrastructure

**Negative**:

- Poor experience for field users in low-connectivity areas
- Tasks and information must be cached in browser (limited offline visibility)
- Users may lose work if editing and connection drops

**Phase 2 (Future): Offline-First with Watermelon DB**

**Positive**:

- Field users can work offline; dramatic improvement in UX
- Sync is automatic; users don't manage sync explicitly
- Conflict resolution is built-in; reduces data loss risk
- Watermelon DB is designed specifically for this pattern

**Negative**:

- Increased client-side complexity
- Sync logic is complex; requires careful testing
- Database schema changes are difficult when clients have local databases
- Storage quota on devices is limited; can't cache entire project database

### Alternatives Considered

- **Implement Now**: Build offline support in Phase 1. Rejected because it's a significant investment for uncertain usage patterns; better to gather real usage data first.
- **WatermelonDB**: Modern offline-first database for React. Selected for future implementation (deferred).
- **PouchDB**: Older offline-first database. Rejected because WatermelonDB is more modern and React-optimized.
- **SQLite on Mobile**: Native SQLite on mobile apps. Rejected because KrewPact initially targets web, not native mobile apps.

---

## ADR-019: Multi-Tenancy and Division-Aware Data Model

**Status**: Accepted

### Context

KrewPact serves construction companies that often have multiple divisions (e.g., residential, commercial, mechanical). Data isolation and access control must respect division boundaries:

- Projects belong to a specific division
- Crew members are assigned to divisions
- Financial data is reported at division level
- Some users have cross-division visibility (executives) while others are division-limited (supervisors)

The data model must support:

- Tenant isolation (one customer's data is completely separate)
- Division filtering (one user may see multiple divisions)
- Audit trails (who accessed what data)
- Efficient queries (filtering by division shouldn't require scanning all data)

### Decision

Multi-tenancy will be implemented at the database level using Supabase Row-Level Security (RLS) policies:

1. **Tables include tenant_id and division_id columns**:
   - Every table that stores tenant-specific data includes `tenant_id` (company/customer ID)
   - Tables like projects, crew, tasks include `division_id` alongside `tenant_id`

2. **RLS Policies enforce access control**:
   - User roles (stored in Clerk via custom claims) are mapped to RLS policies
   - `select` policy: users can only see rows where tenant_id matches their tenant AND division_id is in their allowed divisions
   - `insert` policy: users can only insert rows for their tenant and authorized divisions
   - `update`/`delete` policies: users can only modify rows they have access to

3. **BFF Authorization Layer**:
   - BFF verifies user claims from Clerk (tenant, divisions, role)
   - BFF passes this context to database through Supabase's RLS checks
   - Additional authorization logic at the BFF layer for complex rules (e.g., only project managers can approve change orders)

4. **Audit Logging**:
   - Supabase Audit Logs table tracks data modifications (who, what, when)
   - Audit logs are also subject to RLS, ensuring users only see audit records for their tenant/division

### Consequences

**Positive**:

- Database-level enforcement is more secure than application-level checks
- RLS is automatically enforced even if application logic fails or is bypassed
- Efficient queries; database filters at the row level rather than application layer
- Audit trail is comprehensive; all data modifications are logged
- Scales to any number of divisions and tenants; architecture is not limited by growth
- Clear separation of concerns; database layer owns access control

**Negative**:

- RLS policies can become complex with nested logic (roles with multiple divisions, hierarchical access)
- Debugging RLS issues requires understanding Supabase's policy evaluation
- Performance can be impacted if RLS policies join many tables; requires careful query optimization
- Some queries (e.g., cross-division reporting) require explicit RLS exemptions or special handling
- RLS policies are PostgreSQL-specific; migrating databases would require rewriting policies
- Testing RLS policies is non-trivial; requires setting up different user contexts

### Alternatives Considered

- **Application-Level Filtering**: Enforce multi-tenancy in application code (BFF), not database. Rejected because database-level enforcement is more secure; application bugs could accidentally expose data.
- **Separate Database per Tenant**: Logical isolation using separate databases. Rejected because operational complexity of managing many databases (backups, migrations) exceeds benefits. Single database with RLS is simpler.
- **Hard Sharding**: Separate infrastructure per tenant. Rejected because early-stage product can't afford per-tenant infrastructure costs.

---

## ADR-020: Search Infrastructure

**Status**: Proposed (implementation approach deferred)

### Context

KrewPact requires full-text search across multiple data types:

- Project search (by name, description, address, status)
- Crew search (by name, trade, company)
- Document search (contracts, compliance records)
- Financial search (invoices, purchase orders)
- Task search (by description, assignment, project)

Typical PostgreSQL full-text search has limitations:

- Boolean operators and phrase search are limited
- Typo tolerance (fuzzy matching) is not built-in
- Performance degrades with large datasets
- Relevance ranking is manual

### Decision

Search implementation is deferred to Phase 2. Initial phase uses simple PostgreSQL `ILIKE` queries for basic substring matching, acceptable for early-stage product.

For future Phase 2 implementation, **Meilisearch** is the recommended search platform:

- Self-hosted (or cloud) search engine
- Fast full-text search with typo tolerance out of the box
- Excellent relevance ranking
- No complex configuration; sensible defaults
- REST API simplifies integration with BFF
- Supports multi-language search
- Scales well; can index millions of documents

When implemented:

1. **Meilisearch Deployment**: Self-hosted Meilisearch instance on Proxmox or cloud-hosted
2. **Indexing**: BFF maintains search indexes via Meilisearch API; whenever data is created/updated, search index is updated
3. **Search Endpoints**: BFF exposes `/api/search?q=...&type=projects` endpoint that queries Meilisearch
4. **Filtering**: Search results are filtered through Supabase RLS to ensure users only see data they have access to

### Consequences

**Phase 1 (Current): PostgreSQL ILIKE**

**Positive**:

- Simple to implement; no additional infrastructure
- Sufficient for small datasets
- Familiar to developers
- No additional dependencies

**Negative**:

- Poor performance on large datasets (millions of records)
- No typo tolerance
- Limited relevance ranking
- Boolean operators not well-supported

**Phase 2 (Future): Meilisearch**

**Positive**:

- Fast search even with millions of records
- Typo tolerance (user types "projcet" and still finds "project")
- Excellent relevance ranking with customizable weights
- Beautiful web UI for index management
- Supports advanced queries (filters, ranges, facets)

**Negative**:

- Another service to deploy and maintain
- Index synchronization complexity (keeping Meilisearch in sync with PostgreSQL)
- Storage overhead (search index duplicates data)
- Learning curve for operators

### Alternatives Considered

- **Elasticsearch**: Industry standard search engine. Rejected because Elasticsearch is complex to operate, requires significant resources, and overkill for KrewPact search needs. Meilisearch is simpler and more efficient.
- **Algolia**: Cloud-hosted search. Rejected because cloud search adds cost and vendor lock-in. Meilisearch self-hosted is preferred.
- **Database Full-Text Search (PostgreSQL, MySQL)**: Use database native search. Rejected for Phase 2 because performance doesn't scale well; dedicated search engine is necessary.

---

## ADR-021: Notification System Architecture

**Status**: Proposed (implementation approach deferred)

### Context

KrewPact requires notifications for various events:

- User @mentions and comments
- Task assignments
- Approval requests
- Project milestones reached
- Financial alerts (budget overruns)
- System alerts (data sync failures)
- Daily/weekly digests

Notification delivery must support:

- In-app notifications (via Server-Sent Events or WebSocket)
- Email notifications
- SMS notifications (optional, future)
- Push notifications on mobile (future)
- User notification preferences (frequency, channels, opt-in/opt-out)

### Decision

Notification system architecture is deferred to Phase 2. Initial phase will use simple email notifications triggered by database events.

For Phase 2, the recommended architecture uses **Inngest** for job orchestration (see ADR-009):

1. **Event Triggers**: Application events trigger notification jobs via Inngest API
   - Example: "task assigned" event triggers a notification job
   - Example: "comment posted" event triggers an @mention notification job

2. **Inngest Workflow**: Inngest orchestrates multi-step notification workflows
   - Retrieve user notification preferences
   - Determine delivery channels (email, in-app, SMS)
   - Generate notification content (templating)
   - Send through appropriate channels (email provider, in-app via SSE, SMS provider)
   - Track delivery status and retries

3. **Channels**:
   - **Email**: SendGrid or similar SMTP service
   - **In-App**: Server-Sent Events (SSE) stream to frontend, display notification toaster
   - **SMS**: Twilio (optional, future)
   - **Push**: Firebase Cloud Messaging or Apple Push Notification service (future)

4. **Notification Preferences**: Users configure notification frequency and channels in settings
   - All notifications, important only, digest only, none
   - Per notification type granularity (task assignments, comments, alerts, etc.)

### Consequences

**Phase 1 (Current): Email Only**

**Positive**:

- Simple implementation
- Reliable email delivery via standard SMTP
- Familiar pattern for users

**Negative**:

- Limited notification channels
- Email overload risk; users may disable email to reduce volume
- No real-time in-app notifications
- Digests must be implemented manually if needed

**Phase 2 (Future): Multi-Channel with Inngest**

**Positive**:

- Flexible notification delivery
- User control over notification preferences
- In-app notifications provide immediate feedback
- Inngest handles retries and reliability
- Scales to many users and notification types

**Negative**:

- Increased complexity with multiple delivery channels
- Must manage multiple third-party services (SMTP, Inngest, SMS provider, etc.)
- Notification preferences UI adds product complexity

### Alternatives Considered

- **Implement Full System in Phase 1**: Build multi-channel notifications immediately. Rejected because initial focus should be on core product; notifications can be improved later as usage patterns become clear.
- **Firebase Cloud Messaging (FCM)**: Google's notification service. Rejected because it's primarily for mobile; KrewPact initially targets web.
- **Amazon SNS**: AWS notification service. Rejected because it's more complex than necessary for early stage; Inngest is simpler.

---

## ADR-022: Audit Trail Implementation

**Status**: Accepted

### Context

KrewPact operates in construction where compliance and liability are critical. An audit trail documenting who did what and when is essential:

- Financial data modifications (who approved purchase orders, changed budgets)
- Compliance record changes (training certifications, background checks)
- Contract and change order signatures and approvals
- Access logs (who viewed sensitive data)
- Data exports (for compliance investigation)

Audit trails must:

- Be comprehensive (capture all significant changes)
- Be tamper-proof (difficult to alter retroactively)
- Have minimal performance impact
- Be queryable for compliance reporting
- Integrate with access control (users only see audit records for data they access)

### Decision

Audit trails will be implemented using a combination of Supabase's built-in audit logs and application-level audit logging:

1. **Supabase Audit Logs** (automatic):
   - All database modifications are logged automatically by Supabase
   - Includes: table, operation (INSERT/UPDATE/DELETE), old values, new values, user ID, timestamp
   - These logs are queryable via Supabase API and stored in the `audit.table_log` table

2. **Application-Level Audit Logging** (BFF):
   - For complex business events not captured by database logs (approvals, signature events, access to sensitive data)
   - BFF logs to a dedicated `audit_events` table in Supabase:
     ```
     audit_events {
       id, timestamp, user_id, tenant_id, division_id,
       event_type, resource_id, resource_type,
       old_values, new_values, context (IP, user agent, etc.)
     }
     ```
   - Examples: "approval_given", "contract_signed", "data_exported", "sensitive_field_viewed"

3. **RLS on Audit Tables**:
   - Audit logs are subject to RLS; users only see audit records for their tenant and divisions
   - Executives see division-level audit trails

4. **Compliance Reporting**:
   - Audit logs are queryable via BFF API for compliance reporting and investigation
   - Immutability: audit logs themselves cannot be modified (only-read access enforced by RLS and database constraints)

### Consequences

**Positive**:

- Comprehensive audit trail with minimal additional code
- Supabase audit logs are automatic; no code changes needed
- Tamper-proof; audit logs are system-managed and cannot be modified
- Efficient; audit logging doesn't significantly impact query performance
- RLS ensures compliance with data access controls
- Regulatory compliance support (audit trails required for construction and financial regulations)

**Negative**:

- Audit logs consume storage; historical logs must be archived/retained according to compliance requirements
- Querying large audit logs can be slow; indexes and partitioning may be required
- Complex business logic may generate many audit entries; alerting on specific audit events requires careful configuration
- Privacy implications: audit logs may contain sensitive information (old values of deleted records); must be handled carefully

### Alternatives Considered

- **No Audit Trail**: Accept compliance risk by not tracking changes. Rejected because audit trails are essential for construction compliance and liability management.
- **Third-Party Audit Log Service**: Separate service dedicated to audit logging. Rejected because Supabase's built-in audit logs are sufficient and integrated.
- **Event Sourcing**: Store all data changes as immutable events, reconstructing current state from events. Rejected because event sourcing is operationally complex; Supabase audit logs provide sufficient audit trail without event sourcing complexity.

---

## ADR-023: Caching Strategy

**Status**: Accepted

### Context

KrewPact has performance-sensitive operations:

- Dashboard loading (displaying projects, crew, financials)
- Report generation (financial consolidation, project status)
- Frequent queries (crew schedules, project timelines)

Caching can significantly improve performance and reduce database/API load. However, caching introduces complexity:

- Cache invalidation (ensuring stale data is not served)
- Consistency issues (cached data diverging from source of truth)
- Storage overhead
- Increased complexity (debugging cache-related issues)

### Decision

A layered caching strategy will be implemented:

1. **HTTP Caching (CDN / Browser)**:
   - Static resources (images, CSS, JavaScript bundles) cached aggressively (1 year expiration)
   - API responses with cache headers based on data stability:
     - Stable data (crew members, equipment types): 1 hour cache
     - Volatile data (project status, financials): 5 minute cache or no cache
     - Real-time data (current task assignments, live updates): no cache

2. **Database Query Caching (Tanstack Query / React Query)**:
   - Frontend caches API responses in-memory using Tanstack Query
   - Stale-while-revalidate: show cached data while refreshing in background
   - Manual cache invalidation when mutations occur (create/update/delete)
   - Example: after creating a task, invalidate the tasks list query

3. **Redis Caching (BFF Layer)**:
   - Cache frequently accessed data from ERPNext and Supabase in Redis
   - Example: crew equipment lists, project templates, cost rates
   - Short TTL (15 minutes) to avoid stale data
   - Cache is invalidated when source data changes (via webhooks or periodic sync)

4. **Database Materialized Views (Supabase)**:
   - For expensive aggregations (financial summaries, project reports), use PostgreSQL materialized views
   - Refresh on a schedule or triggered by changes
   - Example: `project_financial_summary` materialized view, refreshed nightly

5. **Avoid Caching**:
   - Financial data (invoices, payments): real-time accuracy is critical; no caching
   - Compliance data (certifications, signatures): no caching
   - Real-time data (live status updates): no caching

### Consequences

**Positive**:

- Reduced latency for frequently accessed data
- Reduced database load; fewer queries executed
- Reduced API calls to external services (ERPNext, ADP)
- Improved user experience; dashboards load faster
- Layered caching provides flexibility; different data types use appropriate caching strategies

**Negative**:

- Cache invalidation complexity; stale data is the primary risk
- Increased debugging difficulty; cache-related bugs are subtle
- Memory overhead; cached data consumes additional resources
- Distributed caching (Redis) adds operational complexity
- Cache misses can be worse than no cache (expensive database queries triggered by expired cache)
- Monitoring cache hit rates requires additional observability

### Alternatives Considered

- **No Caching**: Rely on database performance. Rejected because database load would be higher, and user experience would suffer for slow queries.
- **Cache Everything**: Maximize cache hit rate at the cost of complexity. Rejected because some data (financial, compliance) requires real-time accuracy; selective caching is more appropriate.
- **Memcached**: Simple caching layer. Rejected because Redis is more featureful and has better ecosystem support.

---

## ADR-024: Error Handling and Observability

**Status**: Proposed (monitoring platform deferred)

### Context

KrewPact requires visibility into system health, errors, and performance:

- API errors (5xx, 4xx, validation errors)
- Database errors (connection failures, query timeouts)
- Third-party service errors (ADP, BoldSign, ERPNext failures)
- Performance degradation (slow queries, slow API responses)
- User errors (invalid data, permission denials)

Observability requires:

- Logging (structured logs for debugging)
- Error tracking (identifying and aggregating errors)
- Performance monitoring (latency, throughput)
- Alerting (notifications when issues occur)
- Dashboarding (visibility into system health)

### Decision

Error handling and observability will be implemented in phases:

**Phase 1 (Current)**:

1. **Application Logging**:
   - Structured logging in BFF using Winston or Pino
   - Log levels: debug, info, warn, error
   - Include context: user ID, tenant ID, request ID, timestamp
   - Log to stdout (captured by Docker logs)

2. **Error Response Standardization**:

   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Invalid project status",
       "details": [{ "field": "status", "message": "Invalid value" }],
       "request_id": "uuid-for-tracking"
     }
   }
   ```

3. **Monitoring Dashboard**:
   - Manual logging to Supabase `error_logs` table
   - Query and visualize logs manually via SQL

**Phase 2 (Future)**:

Implement a proper observability stack with one of:

- **Datadog**: Commercial APM platform with excellent features, costly
- **New Relic**: Commercial APM platform, competitive pricing
- **Prometheus + Grafana**: Open-source metrics and dashboarding, requires self-hosting
- **Sentry**: Error tracking and performance monitoring, good for early-stage

Recommendation: **Sentry** for Phase 2

- Generous free tier
- Excellent error tracking and aggregation
- Performance monitoring (transaction tracing)
- Release tracking
- Developer-friendly integration (one-line SDK integration)

### Consequences

**Phase 1 (Structured Logging)**

**Positive**:

- Low overhead; minimal performance impact
- Easy to debug: logs are queryable and searchable
- No vendor dependency; logs are stored in your database
- Cheap or free; logs are just database entries

**Negative**:

- Manual investigation required; no automatic alerting
- No aggregation or correlation; related logs must be found manually
- No performance metrics (latency, throughput)
- Scaling challenges; querying large log volumes is slow

**Phase 2 (Sentry + Structured Logging)**

**Positive**:

- Automatic error aggregation; see error frequency and trends
- Performance monitoring reveals slow operations
- Release tracking (which version introduced the error)
- Alerting (notifications when error rates spike)
- Beautiful dashboard and developer UX

**Negative**:

- Vendor dependency (Sentry)
- Pricing can increase with high error volume or long retention
- Learning curve for Sentry's features and configuration

### Alternatives Considered

- **No Observability**: Log errors to stdout only. Rejected because debugging production issues becomes difficult without aggregation and searching.
- **CloudWatch (AWS)**: AWS's logging service. Rejected because it's vendor-specific to AWS; KrewPact uses Proxmox self-hosted.
- **ELK Stack (Elasticsearch, Logstash, Kibana)**: Open-source logging stack. Rejected for Phase 1 because operational complexity exceeds Phase 1 scope; Sentry is simpler for Phase 2.

---

## ADR-025: Testing Strategy

**Status**: Accepted

### Context

KrewPact integrates multiple systems (ERPNext, Supabase, Clerk, BoldSign, ADP) and has complex business logic around multi-tenancy, financial calculations, and compliance. Testing must:

- Catch regressions and bugs early
- Provide confidence in deployments
- Enable refactoring without fear
- Document expected behavior through tests
- Support different test types (unit, integration, end-to-end)

### Decision

A comprehensive testing strategy with different test types will be implemented:

**Frontend (Next.js + React)**:

1. **Unit Tests** (Jest + React Testing Library):
   - Test individual React components in isolation
   - Focus on user interactions and output
   - Example: Task assignment component correctly renders and handles form submission
   - Coverage target: 60-70% (focus on critical paths, not comprehensive coverage)

2. **Integration Tests** (Playwright):
   - Test user workflows across multiple pages
   - Example: Create project, assign task, update task status, verify financial impact
   - Run against staging environment with real backend
   - Critical workflows: authentication, project creation, financial reporting

3. **Visual Regression Tests** (Playwright visual snapshots):
   - Detect unintended UI changes
   - Screenshot components and compare against baseline
   - Catch CSS regressions and layout issues

**Backend (Node.js BFF)**:

1. **Unit Tests** (Jest):
   - Test business logic in isolation (authorization rules, calculations)
   - Test API response formatting
   - Mock external services (Clerk, ERPNext, ADP)
   - Coverage target: 70-80% (high coverage for business logic)

2. **Integration Tests** (Jest with test database):
   - Test API endpoints with real Supabase instance (or test container)
   - Test database queries and RLS policies
   - Test external service integrations with mocks
   - Example: Create project, verify RLS prevents access from other tenant

3. **End-to-End Tests** (Playwright):
   - Test full workflows from frontend through backend
   - Example: User logs in → creates project → views financials
   - Run against staging environment with real services

**Database (Supabase PostgreSQL)**:

1. **Migration Tests**:
   - Test schema migrations apply correctly
   - Verify migration rollback works
   - Test on a fresh database schema

2. **RLS Policy Tests**:
   - Test access control policies are enforced correctly
   - Verify users can only see/modify their tenant and divisions
   - Test role-based access (admin can see all, supervisor sees division only)

**CI/CD**:

- All tests run on every pull request
- GitHub Actions workflow runs: lint → unit tests → integration tests → build
- Builds fail if tests fail or coverage drops below thresholds
- Deployment to staging after all tests pass
- Manual approval for production deployments

### Consequences

**Positive**:

- Comprehensive testing provides confidence in code quality
- Tests document expected behavior (executable documentation)
- Catch bugs early before production deployment
- Reduce post-deployment firefighting
- Enable safe refactoring
- Build failures alert to issues immediately
- RLS policy tests ensure access control is enforced correctly

**Negative**:

- Writing and maintaining tests requires time and discipline
- Test code is code; test code also has bugs
- Some tests (integration, end-to-end) are slow; slows down CI/CD
- Testing async operations, external services requires careful setup
- Test data management is complex for multi-tenant system
- Flaky tests (tests that sometimes pass, sometimes fail) reduce confidence in test results
- Coverage metrics can be misleading (100% coverage doesn't guarantee correctness)

**Test Pyramid**:

```
         / \
        /E2E\        (Few end-to-end tests)
       /-----\
      / Integ \      (More integration tests)
     /--------\
    /   Unit   \    (Many unit tests)
   /----------\
```

Focus: many unit tests, moderate integration tests, few end-to-end tests. This balances speed (unit tests are fast) with confidence (integration tests verify components work together).

### Alternatives Considered

- **No Testing**: Ship code without automated tests. Rejected because bugs would reach production, and refactoring would be risky. Testing is essential for a SaaS product.
- **Complete Coverage (100%)**: Aim for 100% code coverage. Rejected because it's difficult to achieve, requires testing trivial code, and doesn't guarantee correctness. 70-80% coverage on critical code is more practical.
- **Only End-to-End Testing**: Test everything through the UI. Rejected because E2E tests are slow, fragile (flaky), and difficult to debug. A mix of unit, integration, and E2E is better.
- **Property-Based Testing (QuickCheck, Hypothesis)**: Generate random test inputs to find edge cases. Rejected because property-based testing is advanced and requires expertise; suitable for later optimization after core testing is in place.

---

## Summary

This document outlines 25 architecture decisions for KrewPact, covering:

- **Frontend & UI**: React + Next.js App Router, state management, API design, testing
- **Backend & APIs**: Node.js BFF pattern, REST API, real-time updates
- **Data & Storage**: Supabase PostgreSQL, S3-compatible file storage, caching strategies
- **Integrations**: ERPNext ERP, Clerk authentication, BoldSign e-signatures, ADP payroll
- **Infrastructure**: Vercel frontend hosting, self-hosted Proxmox backend, Tailscale networking
- **Operations**: Nginx Proxy Manager, GitHub Actions CI/CD, monitoring and observability
- **Cross-Cutting**: Multi-tenancy, audit logging, error handling, testing strategies

Each ADR documents the context, decision, consequences, and alternatives considered, providing a comprehensive record of the technical strategy for KrewPact.

**Next Steps**:

1. Review and approve ADRs with technical stakeholders
2. Update ADRs as decisions change or are refined through implementation
3. Reference ADRs in design documents and pull requests to maintain architectural alignment
4. Schedule quarterly ADR review to assess decisions as product evolves
