# KrewPact API-by-API Acceptance Criteria and Test Matrix

## Purpose
This document is the implementation and QA contract for backend APIs.
Every endpoint listed below includes mandatory acceptance criteria and minimum test scenarios.

## Global API Contract Requirements
- Auth: all non-webhook endpoints require valid JWT/session and role-based authorization.
- Scope: division/project scope enforced server-side for all reads/writes.
- Audit: every mutating endpoint writes audit log with actor and before/after values.
- Idempotency: all create/submit endpoints that can be retried must support idempotency keys.
- Validation: request payload validation errors return `422` with field-level details.
- Authorization failures return `403`; unauthenticated requests return `401`.
- Not found returns `404` without leaking cross-tenant existence.
- Optimistic concurrency for mutable resources requiring versioning returns `409` on stale writes.

## 1) Identity, Profile, and RBAC APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `GET /api/v1/auth/session` | Returns active session claims with role/division scopes; no sensitive secrets returned. | Valid token returns claims; expired token returns `401`; tampered token returns `401`. |
| `GET /api/v1/me` | Returns current user profile and effective permissions. | Correct profile for authenticated user; includes effective permissions; unauthorized returns `401`. |
| `PATCH /api/v1/me` | Allows self-service profile updates for permitted fields only. | Valid update succeeds and audits; restricted field update returns `403`; invalid phone/email returns `422`. |
| `GET /api/v1/divisions` | Returns only divisions visible to requester scope. | Platform admin sees all; division user sees assigned divisions only; unauthenticated returns `401`. |
| `POST /api/v1/divisions` | Creates division with unique code and defaults. | Valid create returns `201`; duplicate code returns `409`; non-admin returns `403`. |
| `PATCH /api/v1/divisions/:id` | Updates mutable division settings; archived divisions become read-only. | Valid status update succeeds; update archived division blocked; invalid tax config returns `422`. |
| `POST /api/v1/users` | Provisions user with role/division assignment in one transaction. | Valid create writes `users/user_roles/user_divisions`; unknown role returns `422`; insufficient scope returns `403`. |
| `PATCH /api/v1/users/:id` | Updates user status/assignments with guardrails. | Deactivate user succeeds; self-privilege escalation blocked; cross-division assignment blocked. |
| `POST /api/v1/roles` | Creates role with permission bundle. | Valid role create succeeds; duplicate role key returns `409`; non-admin returns `403`. |
| `POST /api/v1/policy-overrides` | Creates time-bound override requiring reason and approver context. | Valid override with expiry succeeds; missing reason returns `422`; unauthorized user returns `403`. |

## 2) CRM APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `GET /api/v1/leads` | Supports filters, pagination, and scope enforcement. | Filter by stage/source returns expected subset; pagination metadata present; out-of-scope leads excluded. |
| `POST /api/v1/leads` | Creates lead with duplicate detection rules. | Valid create returns `201`; duplicate lead rule violation returns `409`; invalid source enum returns `422`. |
| `GET /api/v1/leads/:id` | Returns lead with timeline summary. | Visible lead returns `200`; hidden lead returns `404`; unauthenticated returns `401`. |
| `PATCH /api/v1/leads/:id` | Updates mutable lead fields and appends stage history when stage changes. | Stage change creates history record; invalid transition blocked with `422`; unauthorized returns `403`. |
| `POST /api/v1/leads/:id/convert` | Converts lead to opportunity preserving activity lineage. | Successful conversion creates opportunity + mapping; repeat conversion idempotent/no duplicate; missing account/contact context returns `422`. |
| `GET /api/v1/accounts` | Returns account list with search and status filter. | Search by name works; inactive filter works; scope enforced. |
| `POST /api/v1/accounts` | Creates account/customer shell. | Valid create `201`; duplicate canonical name conflict `409`; invalid type `422`. |
| `GET /api/v1/contacts` | Returns contacts with account links. | Multiple-account relationships visible; filtered by account works; out-of-scope hidden. |
| `POST /api/v1/contacts` | Creates contact with account relationship. | Valid create with account link succeeds; malformed email fails `422`; unknown account fails `422`. |
| `GET /api/v1/opportunities` | Returns opportunities with stage and value summaries. | Stage filter accurate; totals match response metadata; scope enforced. |
| `POST /api/v1/opportunities` | Creates opportunity with initial stage history row. | Valid create writes stage history; invalid expected_close_date fails `422`; unauthorized `403`. |
| `PATCH /api/v1/opportunities/:id/stage` | Performs stage transition with SLA timestamp updates. | Allowed transition succeeds; disallowed transition returns `422`; stage history immutable after write. |
| `POST /api/v1/activities` | Logs CRM activity under account/lead/opportunity context. | Valid activity create `201`; unknown parent returns `422`; backdated beyond policy blocked `422`. |

## 3) Estimating and Proposal APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `GET /api/v1/cost-catalog-items` | Returns cost items by division/effective date. | Effective date filter works; inactive items excluded by default; scope enforced. |
| `POST /api/v1/cost-catalog-items` | Creates versioned cost item with cost code validation. | Valid create succeeds; unknown cost code fails `422`; overlapping effective window blocked `409`. |
| `POST /api/v1/assemblies` | Creates assembly with nested line item validation. | Valid nested payload succeeds; circular nested assembly blocked `422`; duplicate version key `409`. |
| `POST /api/v1/estimate-templates` | Creates reusable estimate template. | Valid template create succeeds; missing required section fails `422`; non-estimator returns `403`. |
| `GET /api/v1/estimates` | Returns estimate list with status/version metadata. | Query by opportunity/project works; includes latest version marker; scope enforced. |
| `POST /api/v1/estimates` | Creates estimate draft and first version snapshot. | Valid create writes estimate + version; negative quantity blocked `422`; idempotency key prevents duplicates. |
| `GET /api/v1/estimates/:id` | Returns estimate with lines, alternates, allowances. | Full payload returned; out-of-scope estimate hidden; stale ID returns `404`. |
| `PATCH /api/v1/estimates/:id` | Updates draft estimate and writes version diff. | Draft update succeeds with new version; locked/signed estimate edit blocked `409`; invalid tax combination `422`. |
| `POST /api/v1/estimates/:id/reprice` | Reprices estimate using selected price set and effective date. | Reprice creates new version with diff; missing rate cards `422`; non-draft mode blocked unless revision flag. |
| `POST /api/v1/estimates/:id/approve` | Marks estimate approved and emits domain event. | Approval allowed only from valid state; repeat approval idempotent; event `EstimateApproved` emitted once. |
| `POST /api/v1/proposals` | Generates proposal from estimate version and legal template. | Valid create includes machine-readable payload; missing legal template returns `422`; unauthorized role `403`. |
| `GET /api/v1/proposals/:id` | Returns proposal details + timeline. | Full timeline present; signed state read-only markers present; scope enforced. |

## 4) Contracts and E-Sign APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/contracts` | Creates contract from approved proposal with immutable payload hash. | Valid create succeeds with checksum; unapproved proposal blocked `422`; duplicate from same proposal blocked unless amendment mode. |
| `GET /api/v1/contracts/:id` | Returns contract + signature state. | Unsig/signed status accurate; includes linked envelope ID when present; scope enforced. |
| `POST /api/v1/contracts/:id/send-for-signature` | Sends envelope to BoldSign and locks contract payload. | Success sets locked state; resend policy enforced; missing signer data fails `422`. |
| `POST /api/v1/contracts/:id/amend` | Creates amendment lineage and optionally re-sign flow. | Creates new amendment node with parent link; forbidden if original voided; timeline reflects supersession. |
| `GET /api/v1/esign/envelopes/:id` | Returns normalized envelope status/events. | Status transitions mapped correctly; unknown provider event handled gracefully; unauthorized access blocked. |

## 5) Projects, Scheduling, and Field Logs APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/projects` | Creates project from contract/manual setup with baseline requirements. | Valid create succeeds; missing baseline artifacts blocks activation; duplicate job code returns `409`. |
| `GET /api/v1/projects` | Returns project list with role-aware filters. | PM sees assigned + scoped projects; executive sees broader scope; pagination stable. |
| `GET /api/v1/projects/:id` | Returns project summary, members, key metrics. | Includes budget/schedule baseline; out-of-scope returns `404`; malformed ID returns `422`. |
| `PATCH /api/v1/projects/:id` | Updates mutable project fields with approval requirements for baseline changes. | Non-baseline updates succeed; baseline change requires approver context; unauthorized baseline change `403`. |
| `POST /api/v1/projects/:id/members` | Adds member with role and effective dates. | Valid member add succeeds; duplicate active assignment blocked; role not allowed in division `422`. |
| `POST /api/v1/tasks` | Creates task with dependency and assignee rules. | Valid task create succeeds; dependency cycle rejected `422`; assignee outside project scope rejected. |
| `PATCH /api/v1/tasks/:id` | Updates task state/ownership with transition checks. | Valid transition succeeds; invalid transition `422`; stale version update `409`. |
| `POST /api/v1/tasks/:id/comments` | Creates immutable task comment entries. | Valid comment saved; edit/delete policy enforced; unauthorized commenter blocked. |
| `POST /api/v1/project-daily-logs` | Creates daily log (supports offline idempotency token). | Valid submit succeeds; duplicate offline token idempotent; required weather/labor fields validated. |
| `POST /api/v1/site-diary-entries` | Creates site diary event entries. | Valid entry succeeds; backfill beyond retention window blocked by policy; scope enforced. |
| `GET /api/v1/schedules/conflicts` | Evaluates schedule/resource conflicts by date range. | Returns conflict list with severity; no conflicts yields empty list; invalid date range `422`. |

## 6) RFI, Submittal, and Change APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/rfis` | Creates RFI with due date and assignment. | Valid create `201`; due date in past rejected `422`; project scope enforced. |
| `PATCH /api/v1/rfis/:id` | Updates RFI status according to workflow rules. | Valid transition succeeds; closed RFI immutable except reopen path; unauthorized role blocked. |
| `POST /api/v1/rfis/:id/replies` | Adds thread reply with optional attachments. | Valid reply saved; attachments validated; reply after closure blocked unless reopen permission. |
| `POST /api/v1/submittals` | Creates submittal package and enters workflow. | Valid create succeeds; missing spec section fails `422`; unauthorized external actor blocked. |
| `POST /api/v1/submittals/:id/reviews` | Records review decision with comments and next action. | Valid review updates state; invalid reviewer scope blocked; state transition audited. |
| `POST /api/v1/change-requests` | Creates change request with impact data. | Valid create succeeds; negative cost impact rules validated; duplicate from same trigger event flagged. |
| `POST /api/v1/change-orders` | Converts approved request into change order with approval checks. | Requires approved request; writes immutable amount delta; emits `ChangeOrderSigned` on signature completion path. |
| `POST /api/v1/change-orders/:id/approve` | Approves CO and queues ERP budget sync. | Authorized approval succeeds; duplicate approval idempotent; ERP sync job created exactly once. |

## 7) File, Photo, and Document APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/files/folders` | Creates folder in project hierarchy with ACL defaults. | Valid create succeeds; duplicate name conflict by same parent `409`; invalid parent `422`. |
| `POST /api/v1/files` | Registers file metadata and starts upload session. | Valid metadata accepted; unsupported MIME blocked; retention class required. |
| `POST /api/v1/files/:id/versions` | Adds file version with checksum uniqueness check. | New version accepted; duplicate checksum same file blocked unless explicit duplicate flag; version sequence increments. |
| `POST /api/v1/files/:id/shares` | Publishes file to portal audience with expiry. | Valid share creates portal scope; missing audience rejected; unauthorized project role blocked. |
| `POST /api/v1/photos` | Uploads photo metadata and storage pointer. | Valid upload accepted; oversized image policy enforced; geo metadata optional but validated if provided. |
| `POST /api/v1/photos/:id/annotations` | Adds annotation linked to coordinates. | Valid annotation saved; invalid coordinate bounds `422`; annotation audit logged. |

## 8) Safety and Field Compliance APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/safety/forms` | Creates safety form record with checklist schema validation. | Valid submission succeeds; missing signature blocks submit; offline replay idempotent. |
| `POST /api/v1/safety/incidents` | Creates incident with severity and response requirements. | High severity requires mandatory fields; incident notifications dispatched; unauthorized role blocked. |
| `POST /api/v1/safety/toolbox-talks` | Records toolbox talk attendance. | Attendance list required; duplicate attendee entries rejected; timestamp policy enforced. |
| `POST /api/v1/safety/inspections` | Records inspection and deficiency references. | Valid inspection creates record; linked deficiency IDs validated; close action requires approval role. |

## 9) Time, Payroll, and Expense APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/time-entries` | Creates time entry with project/cost-code validation and cutoff policy. | Valid create succeeds; locked period blocked `409`; invalid cost code `422`. |
| `POST /api/v1/timesheets/batches` | Creates timesheet batch for approval cycle. | Valid batch created with totals; duplicate open batch for same period blocked; scope enforced. |
| `POST /api/v1/timesheets/batches/:id/approve` | Approves batch and triggers ADP export queue. | Approval requires payroll role; repeat approval idempotent; ADP job queued once. |
| `POST /api/v1/expenses/claims` | Creates expense claim draft. | Valid create `201`; negative amount rejected; missing project/category `422`. |
| `POST /api/v1/expenses/claims/:id/receipts` | Uploads receipt and links OCR metadata. | Valid upload succeeds; unsupported format rejected; duplicate receipt hash detection works. |
| `POST /api/v1/expenses/claims/:id/submit` | Submits claim into approval workflow. | Valid submit transitions state; submit without receipts blocked by policy; stale version returns `409`. |
| `POST /api/v1/expenses/claims/:id/approve` | Approves claim and queues ERP posting. | Approval role enforced; approved amount cannot exceed submitted by policy; sync job created. |

## 10) Procurement, Bids, and Trade Compliance APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/rfq-packages` | Creates RFQ package with due date and scope references. | Valid create succeeds; due date in past blocked; missing scope docs flagged per policy. |
| `POST /api/v1/rfq-packages/:id/invites` | Sends invites to eligible trade partners only. | Eligible partner invite succeeds; ineligible due to compliance fails `422`; duplicate invite idempotent. |
| `POST /api/v1/rfq-bids` | Accepts bid submission/update before deadline. | Valid bid submit succeeds; after deadline blocked `409`; non-invited bidder rejected `403`. |
| `POST /api/v1/rfq-packages/:id/leveling-sessions` | Creates bid leveling workspace with assumptions snapshot. | Valid create succeeds; cannot create if no bids; assumptions immutable after lock. |
| `POST /api/v1/bid-leveling-entries` | Adds normalized comparison entries. | Valid entry saved; duplicate supplier in same session blocked; formula validation enforced. |
| `POST /api/v1/rfq-bids/:id/award` | Awards bid and queues PO creation sync. | Award requires authority role; only one active award per package; PO sync job queued. |
| `POST /api/v1/trade-compliance-docs` | Uploads and validates compliance documents with expiry checks. | Valid doc upload succeeds; missing expiry for expiring doc type fails `422`; status auto-expired by scheduler tested. |
| `GET /api/v1/trade-compliance/status` | Returns eligibility status by partner/project/date. | Accurate eligibility matrix; cached and realtime parity; unauthorized access blocked. |

## 11) Selections and Allowance APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/selection-sheets` | Creates selection sheet with allowance budgets. | Valid create `201`; negative allowance rejected; duplicate category open sheet blocked unless revision mode. |
| `POST /api/v1/selection-sheets/:id/options` | Adds options with cost delta. | Valid option add succeeds; duplicate option label conflict per sheet; invalid delta precision blocked. |
| `POST /api/v1/selection-sheets/:id/choices` | Records client choice with permission checks. | Authorized client choice accepted; unauthorized delegate blocked; choice locks after deadline if policy enabled. |
| `POST /api/v1/allowance-reconciliations` | Reconciles allowance variance and chooses disposition path. | Variance calculated correctly; unsupported disposition rejected; approved variance queues CO/PO adjustment flow. |

## 12) Closeout, Deficiency, Warranty APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/closeout-packages` | Creates closeout package with required checklist. | Valid create succeeds; missing mandatory checklist docs blocked before complete status; scope enforced. |
| `POST /api/v1/deficiency-items` | Creates deficiency item with priority/SLA. | Valid create succeeds; invalid SLA window rejected; duplicate open deficiency detection works. |
| `PATCH /api/v1/deficiency-items/:id` | Updates deficiency status with reason codes. | Valid close transitions recorded; close without evidence blocked; unauthorized close blocked. |
| `POST /api/v1/warranty-items` | Creates warranty item linked to project/closeout. | Valid create succeeds; invalid warranty period rejected; duplicate scope policy enforced. |
| `POST /api/v1/service-calls` | Creates service call from client/internal intake. | Valid intake succeeds; unknown project/warranty ref rejected; severity defaults applied correctly. |
| `POST /api/v1/service-calls/:id/events` | Appends service call event timeline entries. | Valid event append succeeds; immutable historical events preserved; out-of-order timestamps flagged. |

## 13) Portal APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/portal/accounts/invite` | Invites portal users with scoped project permissions. | Valid invite sent; duplicate active invite idempotent; invalid role for account type blocked. |
| `POST /api/v1/portal/permissions` | Assigns scoped permission matrix. | Valid assignment succeeds; over-privileged assignment blocked; audit record created. |
| `GET /api/v1/portal/projects/:id/summary` | Returns only externally allowed project data. | Allowed fields only; hidden financial/internal notes excluded; unauthorized project access `404`. |
| `POST /api/v1/portal/messages` | Sends scoped portal message. | Valid message delivered; attachment ACL enforced; rate limit applied. |
| `GET /api/v1/portal/view-logs` | Returns visibility/audit logs for portal activity. | Authorized internal roles can query; external users blocked; date filters accurate. |

## 14) Notifications and Automation APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/notifications/dispatch` | Queues notifications by event with preference checks. | Eligible recipients queued; opted-out channels suppressed; invalid template rejected. |
| `GET /api/v1/notifications` | Returns user notification inbox with read states. | Pagination works; only own notifications visible; unread counters accurate. |
| `PATCH /api/v1/notifications/:id/read` | Marks notification read/unread. | Valid toggle succeeds; cross-user write blocked; idempotent on repeated calls. |
| `PATCH /api/v1/notification-preferences` | Updates channel/event preferences. | Valid update persists; invalid channel rejected; audit writes for preference changes. |

## 15) Reporting APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `GET /api/v1/reports/operational` | Returns operational KPIs by scope/filter. | Correct metrics by project/division filters; heavy query pagination/async behavior tested; scope enforcement validated. |
| `GET /api/v1/reports/financial` | Returns ERP-derived financial dashboards from snapshots. | Snapshot freshness metadata included; totals tie to ERP extracts; unauthorized access blocked. |
| `GET /api/v1/reports/compliance-audit` | Returns compliance/audit report with export metadata. | Includes immutable event references; export respects scope; date range validation enforced. |

## 16) Integration and Sync APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/integrations/erpnext/push` | Pushes eligible outbound entities to ERP queue safely. | Valid push enqueues jobs; unsupported entity type rejected; idempotent key prevents duplicate enqueue. |
| `POST /api/v1/integrations/erpnext/pull` | Pulls ERP updates into Hub read models. | Valid pull updates snapshots; stale cursor handled; unauthorized internal role blocked. |
| `POST /api/v1/integrations/erpnext/reconcile` | Reconciles mapped entities and returns variance report. | No-variance run returns pass; variance run returns detailed mismatches; reconciliation audit recorded. |
| `GET /api/v1/integrations/erpnext/sync-jobs/:id` | Returns sync job status and error context. | Pending/failed/dead-letter states accurate; sensitive payload redaction validated; scope checks pass. |
| `POST /api/v1/integrations/adp/export` | Triggers ADP export for approved batches. | Valid export file generated/API call made; partial failures surfaced with retry tokens; role checks enforced. |
| `GET /api/v1/integrations/adp/jobs/:id` | Returns ADP job status and artifact links. | Status lifecycle valid; unauthorized artifact access blocked; expired link behavior validated. |

## 17) Migration APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/migrations/batches` | Creates migration batch definition. | Valid batch created; unsupported source type rejected; duplicate open batch blocked by policy. |
| `POST /api/v1/migrations/batches/:id/run` | Executes migration batch with idempotent run token. | Run starts once per token; rerun behavior explicit; progress metrics emitted. |
| `GET /api/v1/migrations/batches/:id` | Returns migration status, counts, errors. | Counts match records; conflict metrics accurate; unauthorized scope blocked. |
| `POST /api/v1/migrations/conflicts/:id/resolve` | Resolves conflict with reason and approver. | Valid resolution updates state; missing reason rejected; resolution immutable after approval. |

## 18) Privacy, BCP, and Governance APIs

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/privacy/requests` | Creates privacy request with SLA deadline calculation. | Valid request created with SLA; unsupported request type rejected; requester identity verification required. |
| `POST /api/v1/privacy/requests/:id/events` | Appends privacy workflow events. | Valid event append succeeds; invalid sequence blocked; immutable event history verified. |
| `GET /api/v1/privacy/requests/:id/export` | Produces secure export package where applicable. | Authorized export link generated; redaction rules applied; expired links inaccessible. |
| `POST /api/v1/bcp/incidents` | Creates BCP incident and starts response workflow. | Valid incident create with severity matrix; high severity triggers escalation; unauthorized access blocked. |
| `POST /api/v1/bcp/incidents/:id/recovery-events` | Logs recovery actions with timestamps. | Valid event logged; out-of-sequence warning behavior validated; incident state updates correctly. |
| `POST /api/v1/governance/reference-data-sets` | Creates versioned reference set. | Valid create succeeds; duplicate active set key blocked; scope and approval checks enforced. |
| `POST /api/v1/governance/reference-data-values` | Adds/updates reference values with effective dates. | Valid value write succeeds; overlapping effective dates blocked; audit trail written. |
| `GET /api/v1/analytics/adoption` | Returns adoption metrics by role/division/release. | Metrics accuracy against source events; privacy-safe aggregation enforced; unauthorized roles blocked. |

## 19) Webhook Endpoints

| Endpoint | Acceptance Criteria | Minimum Test Cases |
|---|---|---|
| `POST /api/v1/webhooks/boldsign` | Verifies signature/timestamp, processes envelope events idempotently. | Valid signature event accepted; invalid signature rejected `401`; duplicate event ignored with idempotent `200`. |
| `POST /api/v1/webhooks/erpnext` | Validates source/auth and applies ERP doc updates. | Valid event updates target snapshot; unknown doctype safely logged; replay event idempotent. |
| `POST /api/v1/webhooks/payment` | Updates invoice payment status with reconciliation-safe logic. | Valid payment posted; mismatch amount flagged for reconciliation; duplicate callback idempotent. |
| `POST /api/v1/webhooks/adp` | Receives ADP sync status callbacks. | Success/failure callbacks update job states; unknown job IDs handled gracefully; signature validation enforced. |

## Test Execution Coverage Requirements
- Unit: validation, enum mapping, workflow transition guards.
- Integration: DB writes + queue jobs + audit logs per mutating endpoint.
- Contract: request/response schema tests for every endpoint listed.
- Security: authz bypass attempts, tenant boundary tests, webhook spoofing tests.
- Performance: critical list endpoints under target concurrency and pagination loads.
- Resilience: retry/idempotency/dead-letter handling for all async integration paths.

## Release Blocking Quality Gates
- [ ] 100% endpoints in this matrix have passing contract tests.
- [ ] 100% mutating endpoints have audit-log assertion tests.
- [ ] 100% integration endpoints have retry/idempotency tests.
- [ ] No high-severity authz/tenant isolation failures open.
- [ ] Webhook signature verification tests pass for all providers.
