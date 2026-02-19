# KrewPact DevOps and CI/CD Strategy

## 1. CI/CD PIPELINE ARCHITECTURE

> **Decision Rationale:** See [KrewPact-Technology-Stack-ADRs.md](./KrewPact-Technology-Stack-ADRs.md) ADR-014 for CI/CD platform decision and alternatives analysis.

### GitHub Actions Workflow Design

The continuous integration and continuous deployment pipeline is the backbone of KrewPact development velocity and reliability. GitHub Actions serves as the primary automation platform, leveraging native GitHub integration to eliminate external dependencies.

**Workflow Organization:**
- Individual workflow files per pipeline stage for modularity and reusability
- Shared action workflows for common operations (build, test, deploy)
- Environment-specific configuration via GitHub Actions secrets and variables
- Matrix strategies for testing across Node versions and database configurations
- Conditional execution based on file changes and branch patterns

**Permissions Model:**
- Minimal required permissions per workflow (principle of least privilege)
- Branch protection rules enforce required status checks before merging
- GITHUB_TOKEN scoped appropriately for each workflow job
- Custom credentials stored as organization secrets (not in repository)

### Pipeline Stages

The continuous integration pipeline follows a strictly linear progression, ensuring code quality gates are enforced before production deployment.

**Stage 1: Lint**
- ESLint validation across all TypeScript and JavaScript files
- Markdown linting for documentation
- YAML validation for configuration files
- Prettier formatting checks
- Spellcheck on documentation and commits
- Failure at this stage blocks progression to subsequent stages

**Stage 2: Type Check**
- TypeScript strict mode compilation without code generation
- No JavaScript runtime execution, pure type validation
- tsc --noEmit for both frontend and backend codebases
- Type coverage reporting (minimum 85% required)
- Catch refactoring errors early before testing

**Stage 3: Unit Test**
- Vitest execution for frontend components and utilities
- Vitest execution for backend API handlers and services
- Coverage thresholds enforced (minimum 70% overall, 80% for critical paths)
- Parallel execution across multiple workers
- HTML coverage reports uploaded to GitHub Actions artifacts

**Stage 4: Build**
- Frontend: Next.js production build validation
- Backend: Node.js TypeScript compilation to JavaScript
- Docker image build for backend API (if Dockerfile changes)
- Asset optimization and tree-shaking verification
- Build artifact size reporting and alerts on significant increases

**Stage 5: Integration Test**
- API integration tests against test Supabase instance
- ERPNext API mocking and integration validation
- Database state verification after operations
- Cross-service contract testing
- Payment gateway mock testing

**Stage 6: Deploy**
- Frontend deployment to Vercel (preview or production)
- Backend Docker image push to container registry
- Backend service deployment to Proxmox infrastructure
- Database migration execution
- Health check validation post-deployment
- Slack notification of deployment status

### Branch Strategy

The branching model supports parallel development while maintaining production stability.

**Main Branch (main)**
- Protected branch requiring at least one approved review
- Deploy to production automatically on successful merge
- Only fast-forward merges from develop or hotfix branches
- Tag all production deployments with semantic version
- Backed up daily for disaster recovery

**Develop Branch (develop)**
- Integration branch for feature completion
- Deploy to staging environment automatically on merge
- Created from main at release time, merges back to main after testing
- Contains pre-release versions of features
- Synced with main at minimum weekly

**Feature Branches (feature/*)**
- Branch naming: feature/ISSUE-NUMBER-description
- Example: feature/AUTH-42-oauth-integration
- Created from develop, merged back via pull request
- Deleted automatically after merge
- Preview deployments generated automatically on push
- Maximum 10 open feature branches at any time

**Hotfix Branches (hotfix/*)**
- Branch naming: hotfix/ISSUE-NUMBER-description
- Created from main for critical production fixes
- Merged to both main and develop
- Deployed directly to production after review
- Bumps patch version immediately

**Release Branches (release/*)**
- Branch naming: release/VERSION (example: release/2.1.0)
- Created from develop for release preparation
- Contains only bug fixes and version bumps
- Merged to main when ready
- Creates GitHub Release with changelog

### Pull Request Workflow

Every code change flows through a standardized pull request process.

**Required Reviews:**
- Minimum two approvals for changes to main branch
- Minimum one approval for develop branch
- Code owners file specifies domain experts for each directory
- Dismissal of stale pull request reviews when commits are pushed
- Self-approval prohibited (CODEOWNERS cannot approve own PRs)

**Status Checks Required Before Merge:**
- All CI pipeline stages pass (lint, type, unit, build, integration)
- No merge conflicts with base branch
- Code review approvals from designated reviewers
- CodeQL security scanning passes
- Dependabot checks resolved (if applicable)
- Commit history linear (no merge commits)

**Auto-Merge Rules:**
- Enable auto-merge for Dependabot PRs (patch version dependencies)
- Require manual approval for minor and major version updates
- Delete head branch automatically after merge
- Squash commits into single message using conventional commit format

**Pull Request Template:**
- Description of changes and business context
- Issues resolved (reference with Closes #NUMBER)
- Testing instructions for reviewers
- Screenshots or videos for UI changes
- Breaking changes documented explicitly
- Dependencies added/updated listed

## 2. BUILD AND DEPLOY WORKFLOWS

### Frontend Deployment: Next.js to Vercel

The frontend application deploys continuously to Vercel for optimal performance and developer experience.

**Automatic Production Deployment**
- Merging to main branch triggers production build
- No manual deployment step required
- Vercel builds Next.js application in optimized mode
- Static site generation for marketing pages
- Server-side rendering for authenticated features
- Incremental static regeneration for frequently updated content
- Environment variables injected from GitHub Actions secrets
- Custom domain routing via Vercel configuration

**Preview Deployments for Pull Requests**
- Every push to feature branch generates preview deployment
- Unique URL generated per branch (example: mybranch.myproject.vercel.app)
- GitHub integration posts preview link as PR comment
- Preview includes analytics and performance monitoring
- Automatic cleanup when PR closes

**Environment Variable Management**
- Production variables stored in Vercel project settings
- Preview variables separated from production
- Sensitive values (API keys, database URLs) encrypted
- Supabase client key and public URL configured
- External API endpoints (payment gateway, ERPNext) configured
- Feature flag endpoints configured

**Build Optimization**
- Image optimization via Next.js Image component
- WebP and AVIF format support for modern browsers
- Automatic code splitting and tree-shaking
- CSS-in-JS optimization and critical CSS extraction
- Font optimization (system fonts preferred, subset Google Fonts)
- Bundle analysis reports generated after each build
- Cache-Control headers optimized for static and dynamic content

**Deployment Rollback Procedure**
- Vercel maintains previous 25 deployments
- One-click rollback available in Vercel dashboard
- GitHub Actions can revert to previous commit if needed
- Database migrations always backward compatible
- Feature flags allow gradual rollback of features

### Backend API Deployment: Node.js via Docker to Proxmox

The backend API runs in containerized form on Proxmox infrastructure for isolation and scalability.

**Docker Image Build and Push**

The Docker build process creates reproducible, optimized images.

- Build context limited to necessary files (via .dockerignore)
- Multi-stage build: build stage compiles TypeScript, runtime stage runs Node
- Build stage: Node 20 LTS, installs dependencies, compiles to JavaScript
- Runtime stage: Node 20 slim image, copies compiled code only
- Image tagged with git commit SHA and semantic version
- Latest tag points to most recent stable release
- Image pushed to private Docker registry (Docker Hub or Proxmox registry)
- Image scanning for vulnerabilities via Trivy before push
- Build takes approximately 3-5 minutes on GitHub Actions runner

**Container Deployment Strategy: Rolling Updates**

Zero-downtime deployments via gradual replacement of containers.

- Minimum two container replicas always running
- Load balancer distributes traffic across healthy containers
- New version deployed to first replica (health check required)
- After successful health check, traffic routed to new replica
- Second replica updated with new version
- Old version removed from registry only after seven days
- Kubernetes-style rolling update logic implemented in orchestration script
- Maximum 30 second disruption per replica during update

**Health Check Validation**

Post-deployment health verification ensures container is operational.

- Health endpoint: GET /api/health returns JSON status
- Checks database connectivity (Supabase)
- Checks ERPNext API reachability
- Checks Redis connectivity (if used)
- Returns 200 OK only if all checks pass
- Health check runs every 10 seconds
- Container marked unhealthy after 3 consecutive failures
- Automatic container restart triggered after 30 seconds unhealthy

**Rollback Procedure**

Rapid recovery from deployment issues.

- Docker Compose stops current containers
- Previous version pulled from registry
- New containers started with previous version
- Health checks validated before marking success
- Team notified via Telegram of rollback action
- Post-incident review scheduled for same day
- No manual intervention typically required (automatic rollback on health check failure)

### ERPNext Custom Apps Deployment

Custom apps built on the ERPNext platform deploy via bench-based workflow.

**Bench-Based Deployment**

The bench tool manages multiple ERPNext apps in isolated environments.

- Custom app code stored in version control (Git)
- Bench application at /home/erpnext/frappe-bench on production VM
- Custom apps in bench apps directory
- app-includes.txt tracks which custom apps are enabled
- Git pull executed from repository for each custom app
- Permissions reset to erpnext user after pull

**App Installation and Configuration**

Custom apps integrate into ERPNext securely and functionally.

- Hooks.py defines module, permissions, scheduled jobs, API routes
- Modules property lists which desk modules the app provides
- Permissions defined via role-based access control
- Scheduled tasks defined for background processing
- REST API routes exposed via frappe.call
- Database fixtures installed on first deployment
- Configuration stored in site_config.json

**Migration Execution**

Custom app deployments execute database migrations.

- Migrations stored in app/migrations/ directory
- Migration naming: YYYYMMDD_HHMM_description.py
- Each migration is idempotent (safe to run multiple times)
- Migrations execute automatically during app installation
- Rollback migrations available (reverse operations)
- Database backup taken before any migration
- Failed migrations logged with full traceback

**Custom App Versioning**

Custom apps are versioned independently from ERPNext core.

- App __init__.py contains version string
- Semantic versioning followed (major.minor.patch)
- Git tags mark release versions (v1.2.3)
- Changelog maintained in app root
- Breaking changes documented prominently
- Compatibility matrix specifies ERPNext versions supported

### Database Migrations

Schema changes and data transformations are managed safely and reversibly.

**Supabase Migration Workflow**

Supabase handles migrations via SQL files committed to repository.

- Migrations stored in migrations/ directory (format: YYYYMMDD_HHMM_description.sql)
- Migration generation via Supabase dashboard or CLI
- Each migration is atomic (all or nothing)
- Up migration defined, down migration must also be defined
- Migrations run sequentially in order
- Supabase manages migration state in schema_migrations table
- GitHub Actions triggers migration execution on deploy
- Migration status visible in Supabase dashboard
- Rollback available by running down migration

**ERPNext Schema Changes**

Schema modifications within ERPNext go through DocType management.

- DocTypes are versioned via Git (stored as JSON)
- Database schema auto-updates when DocType modified
- Custom fields added via DocType customization
- Field validators and computed values defined in DocType
- New fields can be added without data loss
- Field removal requires data migration first
- Renaming fields requires data migration
- ERPNext tracks schema version in DocType

**Rollback Strategy**

Deployment failures trigger immediate data rollback.

- Database backup taken pre-deployment (automated)
- Supabase provides point-in-time restore capability
- Rollback script available to restore from backup
- Manual intervention required for complex rollbacks
- Data integrity verified after rollback
- Team notified immediately of rollback
- Root cause analysis required before re-deployment

## 3. TESTING STRATEGY

> **Testing Strategy Rationale:** See [KrewPact-Technology-Stack-ADRs.md](./KrewPact-Technology-Stack-ADRs.md) ADR-025 for testing strategy decision and coverage targets.

A comprehensive testing pyramid ensures quality at all levels, from unit tests to end-to-end integration tests.

### Test Pyramid Architecture

The testing strategy emphasizes speed and cost-effectiveness.

**Foundation: Unit Tests (70% of tests)**
- Fast execution (milliseconds per test)
- Low cost (CPU intensive, not resource intensive)
- High isolation (minimal external dependencies)
- Frequent execution (every commit, every pull request)

**Middle: Integration Tests (20% of tests)**
- Test interaction between modules
- Use test containers for databases and external services
- Execute in CI pipeline on every merge
- Moderate execution time (seconds per test)

**Top: End-to-End Tests (10% of tests)**
- Test complete user workflows
- Run in staging environment
- Execute on schedule and pre-production deployment
- Longest execution time, most resources required

### Unit Testing

Unit tests validate individual functions and components in isolation.

**Frontend Unit Tests (Vitest)**
- Component rendering tests using React Testing Library
- Props validation and edge cases
- Event handler testing (click, submit, change events)
- Hook behavior validation (useState, useEffect, custom hooks)
- Redux action and selector testing
- Utility function input/output validation
- 80% code coverage target for critical paths, 70% overall

**Test File Structure:**
- Test files collocated with source files (component.test.tsx next to component.tsx)
- Describe blocks organize tests by component/function
- Test names describe the behavior being tested (not implementation details)
- Arrange-Act-Assert pattern for test clarity
- Shared fixtures and mock factories for reusable test data

**Backend API Unit Tests (Vitest)**
- Route handler testing with mock requests/responses
- Middleware validation
- Service layer business logic testing
- Database repository layer testing with mock data
- Error handling and edge case validation
- 80% code coverage target for critical paths

**Mock Strategy:**
- vitest.mock() for module mocking
- jest.spyOn() for spying on function calls
- Manual mock implementations for complex services
- Factory functions for test data generation
- Mock servers for external API calls (not used in unit tests)

**Coverage Reporting:**
- Coverage report generated after test execution
- HTML coverage report uploaded to GitHub Actions artifacts
- Coverage decreases block PR merge
- Missing coverage statements highlighted in code review

### Integration Testing

Integration tests validate interactions between multiple components and services.

**API Integration Tests**
- Test full API endpoint flows (request → business logic → database)
- Use test Supabase instance (separate from production)
- Test database transactions and rollbacks
- Test authentication and authorization flows
- Test error handling with various input combinations
- Test data consistency across related entities

**Supabase Test Containers**
- Docker container runs PostgreSQL and Supabase emulator
- Database starts fresh before each test suite
- Migrations applied automatically (same migrations as production)
- Test data seeded from fixtures
- Database cleared after test suite completes
- Tests can run in parallel (each gets isolated database)

**ERPNext Integration Tests**
- Test bench app endpoints and database operations
- Mock frappe HTTP client for ERPNext API calls
- Validate DocType behavior and validations
- Test scheduled job execution
- Test custom scripts and automation rules

**Database State Verification:**
- Query results verified at database level (not just in-memory)
- Foreign key constraints validated
- Unique constraint violations caught
- Transaction isolation verified
- Rollback behavior validated

### End-to-End Testing

End-to-end tests validate complete user journeys from frontend through backend.

**Playwright Test Framework**
- Browser automation testing using Chromium, Firefox, WebKit
- Headless mode for CI, headed mode for local debugging
- Tests run against actual deployed application
- Test isolation via session and data cleanup

**Test Coverage Areas:**
- User authentication flows (signup, login, password reset)
- Estimate creation to contract signature workflow
- Portal navigation and data retrieval
- ERPNext synchronization and data display
- PDF generation and download
- Email notification delivery
- Payment processing flows

**Test Structure:**
- Page Object Model for maintainability
- Selectors separated from test logic
- Reusable fixtures for test setup
- Parallel execution across multiple test files
- Retry failed tests automatically (flakiness handling)

**Reliability and Maintenance:**
- Explicit waits for dynamic content
- Network idle strategies for SPA navigation
- Screenshot capture on test failure
- Video recording of failed test execution
- Regular maintenance (UI selectors updated as app evolves)

### API Contract Testing

Contract testing validates API specifications and compatibility.

**Contract Definition:**
- API contracts defined in OpenAPI 3.0 format
- Request/response schemas specified explicitly
- Validation tools check actual responses against schemas
- Contracts shared between frontend and backend teams
- Breaking changes caught before deployment

**Testing Approach:**
- Backend tests verify responses match contract
- Frontend tests verify mock responses match contract
- Breaking changes fail CI pipeline
- Schema versioning supports gradual API evolution

### Performance Testing

Performance tests identify bottlenecks and ensure scalability.

**k6 Load Testing Framework**
- JavaScript-based load testing tool
- Scenario-based testing (realistic user patterns)
- Ramp-up and soak testing strategies
- Response time assertions (p95 < 500ms, p99 < 1s)
- Error rate assertions (< 0.1%)
- Resource utilization monitoring

**Test Scenarios:**
- Create estimate: 10 concurrent users, 30 second duration
- Portal login: 50 concurrent users, 5 minute duration
- Estimate retrieval: 100 concurrent users, 10 minute duration
- Search functionality: 50 concurrent users, 5 minute duration

**Baseline and Regression:**
- Performance baseline established for main branch
- Performance compared after code changes
- Significant regressions block merge
- Results tracked over time to identify trends

### Accessibility Testing

Accessibility tests ensure product is usable by all users.

**axe-core Integration Testing**
- Automated accessibility scanning in CI pipeline
- Catches common accessibility violations
- WCAG 2.1 Level AA standards enforced
- Color contrast verification
- Alt text for images validated
- Form label association checked

**Manual Accessibility Testing:**
- Keyboard navigation testing (Tab, Enter, Escape)
- Screen reader testing with NVDA/JAWS
- Focus management validation
- ARIA attributes correctly applied
- Semantic HTML usage enforced

## 4. CODE QUALITY

Code quality standards are enforced automatically and consistently across the entire codebase.

### ESLint Configuration

ESLint provides static analysis and style enforcement.

**Configuration Approach:**
- Separate configurations for frontend and backend
- Frontend uses eslint-config-next as base
- Backend uses eslint-config-airbnb as base
- Custom rules added for project-specific patterns
- React-specific rules: hooks, JSX accessibility, prop validation
- TypeScript-specific rules: type safety, interfaces

**Enforced Rules:**
- No console.log in production code (allowed in development)
- No commented-out code
- No unused variables or imports
- No implicit any types
- No any type usage (explicit typing required)
- Consistent naming conventions (camelCase for functions, PascalCase for components)
- Maximum line length of 100 characters
- Trailing commas in multiline objects/arrays

**Execution:**
- ESLint runs as first CI pipeline stage
- Fails pull request merge if violations found
- Pre-commit hook runs ESLint locally before commit
- VS Code extension provides instant feedback during development

### Prettier Code Formatting

Prettier ensures consistent code style without debate.

**Configuration:**
- Single quote preference (single quotes except JSON)
- Trailing commas (ES5 mode: only where valid)
- Print width 100 characters
- Tab width 2 spaces
- Semicolons required

**Scope:**
- Formats JavaScript, TypeScript, JSX, TSX
- Formats CSS, SCSS
- Formats JSON files
- Ignores generated files and node_modules

**Integration:**
- Runs as part of ESLint configuration
- Pre-commit hook formats files before commit
- CI pipeline fails if formatting inconsistent
- VS Code extension auto-formats on save

### TypeScript Strict Mode

TypeScript strict mode eliminates entire classes of bugs.

**Enabled Rules:**
- strict: true (enables all strict flags)
- noImplicitAny: true (no implicit any types)
- strictNullChecks: true (null/undefined handled explicitly)
- strictFunctionTypes: true (function parameters contravariant)
- strictBindCallApply: true (bind/call/apply type checked)
- strictPropertyInitialization: true (class properties initialized)
- noImplicitThis: true (this context must be explicit)
- alwaysStrict: true (use strict directive)
- noUnusedLocals: true (unused variables fail compilation)
- noUnusedParameters: true (unused parameters fail compilation)
- noImplicitReturns: true (all code paths return)
- noFallthroughCasesInSwitch: true (switch cases explicit)
- noUncheckedIndexedAccess: true (array access type safe)

**Compilation:**
- TypeScript compilation runs in CI pipeline before tests
- Type checking uses --noEmit (no JavaScript output)
- Takes approximately 30 seconds on typical codebase
- Catches refactoring errors early

### Husky Pre-Commit Hooks

Husky automates code quality checks before commit.

**Hooks Configured:**
- pre-commit: Runs ESLint and Prettier on staged files
- pre-push: Runs unit tests locally before pushing
- prepare-commit-msg: Adds issue number from branch name

**Execution:**
- Installed automatically via npm install
- git commit triggers hooks automatically
- Failing hooks prevent commit
- --no-verify flag available for emergencies only
- CI pipeline provides full validation (hooks can be skipped locally)

**Staged File Linting:**
- lint-staged tool runs linters only on staged files
- Faster feedback loop than entire codebase
- Prevents committing linting violations
- Prettier auto-fixes formatting issues
- ESLint reports violations (doesn't auto-fix)

### Commitlint

Commitlint enforces conventional commit format.

**Conventional Commits Format:**
```
type(scope): subject

body

footer
```

**Allowed Types:**
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that don't affect code meaning (formatting, semicolons, etc)
- refactor: Code change that neither fixes a bug nor adds a feature
- perf: Code change that improves performance
- test: Adding missing tests or correcting existing tests
- chore: Changes to build process, dependencies, tooling

**Examples:**
- feat(auth): add OAuth integration
- fix(api): prevent race condition in sync
- docs(readme): update installation instructions
- chore(deps): update Next.js to 14.0.0

**Configuration:**
- commitlint.config.js defines rules
- Maximum subject line length 50 characters
- Scope in lowercase (optional)
- Type must match allowed types
- Pre-commit hook validates before commit
- CI pipeline validates again on push

### SonarQube Code Quality Analysis

SonarQube provides comprehensive code quality metrics and trending.

**Metrics Tracked:**
- Code coverage percentage
- Cyclomatic complexity (maximum 15 per function)
- Cognitive complexity (maximum 25 per function)
- Code smells (maintainability issues)
- Vulnerabilities (security issues)
- Bugs (potential runtime errors)
- Duplicated code percentage (maximum 3% allowed)

**Execution:**
- SonarQube scanner runs in CI pipeline after tests
- Analyzes code coverage reports from Vitest
- Fails pipeline if quality gates not met
- GitHub integration posts analysis in PR comments
- Trend analysis shows quality improvements/regressions over time

**Quality Gates:**
- Coverage > 70%
- No new code smells
- No new vulnerabilities
- No new bugs
- Duplicated code < 3%

### Dependency Vulnerability Scanning

Dependabot and Renovate keep dependencies secure and up-to-date.

**Dependabot Configuration:**
- Weekly scan of dependencies against known vulnerabilities
- Automatic PR creation for security updates
- Patch version updates auto-merged (after tests pass)
- Minor version updates require manual review
- Major version updates flagged for breaking changes

**Renovate Configuration (Alternative):**
- More flexible configuration than Dependabot
- Groups related dependencies (all Next.js packages together)
- Schedules updates (weekend or off-hours)
- Auto-merges test-passing updates
- Changelog generation in PR descriptions

**Vulnerability Response:**
- Critical vulnerabilities block PR merge
- High severity vulnerabilities require immediate action
- Regular updates prevent dependency debt
- Unused dependencies removed regularly
- Import statements audited for unnecessary packages

## 5. RELEASE MANAGEMENT

Releases are managed systematically to ensure stability and traceability.

### Semantic Versioning Strategy

KrewPact follows semantic versioning (MAJOR.MINOR.PATCH).

**Version Increment Rules:**
- MAJOR: Breaking changes (API incompatible, data migrations required)
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

**Pre-Release Versions:**
- Alpha versions: 1.2.0-alpha.1 (incomplete features)
- Beta versions: 1.2.0-beta.1 (feature complete, may have issues)
- Release candidates: 1.2.0-rc.1 (ready for release, testing only)

**Version Numbering:**
- Start at 1.0.0 (never 0.x.x in production)
- Increment major every 3-6 months typically
- Increment minor every 1-2 weeks typically
- Increment patch multiple times per week

### Changelog Generation

Changelog documents all changes for each release.

**Changelog Format (CHANGELOG.md):**
```markdown
## [1.2.0] - 2024-03-15

### Added
- Feature description

### Changed
- Behavior change description

### Fixed
- Bug fix description

### Deprecated
- Feature being phased out

### Removed
- Feature removed
```

**Commit Message to Changelog:**
- feat() commits become Added section
- fix() commits become Fixed section
- chore() commits excluded (except breaking changes)
- Breaking change footer becomes separate section
- Scopes grouped together

**Automated Generation:**
- conventional-changelog tool generates automatically
- Scans commit messages since last release
- Groups changes by type
- Includes link to diff between versions
- Prepended to existing CHANGELOG.md

### Release Notes Automation

Release notes provide user-friendly descriptions of changes.

**Release Notes Content:**
- Marketing description of release highlights
- Key features added (non-technical language)
- Known issues and workarounds
- Upgrade instructions
- Thank you credits for contributors
- Link to full changelog

**Creation Process:**
- AI tool (e.g., ChatGPT) summarizes commits for human readability
- Founder reviews and edits release notes
- Draft created in GitHub Releases UI
- Published simultaneously with tag creation

**Distribution:**
- Release notes visible on GitHub Releases page
- Posted to company website/blog
- Email notification to customers
- In-app notification for portal users

### Feature Flags

Feature flags enable safe feature rollout and testing.

**Feature Flag System (Recommended: Unleash Open Source)**
- Self-hosted Unleash server on Proxmox
- Segment-based targeting (by user, environment, percentage)
- Real-time toggle without redeployment
- Metrics tracking (usage, adoption rate)
- A/B testing capabilities

**Flag Lifecycle:**
- Flag created in staging environment first
- Feature code behind flag (100% off initially)
- QA tests with flag enabled
- Gradual rollout (10% → 25% → 50% → 100%)
- Flag monitored for errors, performance impact
- Flag removed after 2 weeks in production (at 100%)

**Flag Configuration:**
- Flag name: descriptive lowercase with hyphens (new-estimate-flow)
- Description: business purpose and technical details
- Owner: team member responsible
- Enabled by default: true/false
- Segments: rules for when enabled (beta users, specific user ID, percentage)
- Metrics: track adoption, errors, performance

**Code Integration:**
- Flag checked at feature boundary (not throughout feature)
- Fallback behavior clear when flag disabled
- No orphaned flag code (removed when flag removed)
- Tests cover both flag enabled and disabled paths

### Canary Deployments (Future Enhancement)

Canary deployments will minimize risk of bad releases.

**Strategy (Not Currently Implemented):**
- Deploy new version to 5% of users
- Monitor error rates and performance metrics
- Automatic rollback if error rate > 1%
- Gradual increase: 5% → 25% → 50% → 100%
- Pause at each stage for minimum 1 hour monitoring
- On-call engineer required during canary period

**Monitoring During Canary:**
- Error rates by endpoint
- Response time distribution
- API endpoint-specific failure rates
- Logs from canary traffic only
- User session tracking for canary cohort

## 6. INFRASTRUCTURE AS CODE

Infrastructure is defined as code for consistency, reproducibility, and version control.

### Docker Compose for Local Development

Docker Compose creates local development environment matching production.

**Services Defined:**
- Node.js API server (port 3000)
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- Frontend development server (port 3001)
- MailHog for email testing (port 1025, web UI 8025)
- Supabase local development (if using Supabase locally)

**docker-compose.yml Structure:**
```yaml
version: '3.8'
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/krewpact_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./api:/app
      - /app/node_modules

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=krewpact_dev
      - POSTGRES_USER=dev
      - POSTGRES_PASSWORD=dev123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

**Getting Started:**
- Run: docker compose up -d
- Database initialized with migrations
- Seed data loaded from fixtures
- Services available at localhost:3000 (API), localhost:3001 (frontend)
- Stop with: docker compose down
- Logs viewed with: docker compose logs -f SERVICE_NAME

**Data Persistence:**
- Named volumes persist data between restarts
- docker compose down -v removes volumes (full reset)
- Backup database with: docker compose exec db pg_dump > backup.sql
- Restore with: docker compose exec -T db psql < backup.sql

### Docker Compose for Production Services

Production Docker Compose manages helper services alongside containerized API.

**Production Services:**
- Node.js API server (single or multiple replicas)
- PostgreSQL container (optional, if not using Supabase)
- Redis container (for caching and job queues)
- Nginx reverse proxy (load balancing, SSL termination)
- Prometheus (metrics collection)
- Grafana (visualization)

**Deployment:**
- docker compose -f docker-compose.prod.yml up -d
- Health checks ensure containers stay running
- Restart policies handle crashes
- Networks isolate services from external access
- Only Nginx exposed to internet (ports 80, 443)

**Scaling:**
- Multiple API replicas: docker compose up -d --scale api=3
- Load balancer distributes traffic across replicas
- Shared Redis and PostgreSQL serve all API instances
- Database connection pooling prevents connection exhaustion

**Updates:**
- New version: pull latest image
- Run: docker compose -f docker-compose.prod.yml pull
- Rolling restart: docker compose up -d (replaces containers with new image)
- Previous version available for rollback

### Ansible Playbooks for Proxmox VM/CT Provisioning

Ansible automates infrastructure provisioning and configuration on Proxmox.

**Playbook Structure:**
```
playbooks/
  ├── provision-vm.yml (create new VM)
  ├── provision-ct.yml (create new container)
  ├── configure-api-server.yml (install and configure API)
  ├── configure-database.yml (install and configure PostgreSQL)
  ├── configure-monitoring.yml (install Prometheus/Grafana)
  └── roles/
      ├── common (baseline packages)
      ├── docker (Docker installation)
      ├── api-server (API-specific configuration)
      └── monitoring (monitoring tools installation)
```

**VM/CT Provisioning:**
- Proxmox API called to create VM or LXC container
- Base template selected (Ubuntu 22.04 LTS)
- CPU, RAM, disk allocated per specification
- Network configured (static IP assignment)
- Ansible provisioner configured to run post-creation
- Configuration applied within minutes
- Inventory updated automatically

**Configuration Management:**
- Baseline packages installed (curl, git, htop, etc.)
- Docker installed and configured
- Docker daemon started and enabled
- User created for API service
- SSH key-based authentication configured
- Firewall rules applied (only necessary ports open)
- Fail2ban configured for brute force protection
- NTP time sync configured

**Variable Management:**
- group_vars/all.yml: global variables
- group_vars/api_servers/: API-specific variables
- host_vars/api-prod-01/: host-specific variables
- Vault used for sensitive values (passwords, API keys)
- Environment-specific variable sets (dev, staging, prod)

**Idempotency:**
- Playbooks safe to run multiple times
- Services restarted only if configuration changed
- Packages upgraded only if newer version available
- Handlers trigger configuration reload without disruption

### Configuration Management

Application configuration stored in version control or secrets management system.

**dotenv Files:**
- .env.example committed to repository (no secrets)
- .env files created from .env.example locally
- .env files NOT committed (added to .gitignore)
- Development values safe to commit in .env.example
- All developers have consistent environment setup

**Environment Variables:**
- API_URL: Backend API endpoint
- SUPABASE_URL: Supabase project URL
- SUPABASE_ANON_KEY: Supabase public API key
- ERPNEXT_API_KEY: ERPNext authentication token
- ERPNEXT_API_SECRET: ERPNext secret
- REDIS_URL: Redis connection string
- DATABASE_URL: PostgreSQL connection string
- NODE_ENV: development, staging, production
- LOG_LEVEL: debug, info, warn, error

**Secrets Management (HashiCorp Vault):**
- Vault server runs on Proxmox infrastructure
- Sensitive values stored encrypted at rest
- Access controlled via role-based authentication
- Audit log tracks all secret access
- Secrets rotated on schedule (quarterly)
- Application retrieves secrets at startup
- Secrets cached in application memory (not re-fetched)
- Startup fails if required secrets unavailable

**Configuration Loading Priority:**
1. Environment variables (highest priority)
2. Vault secrets (if Vault enabled)
3. .env file in application root
4. Configuration file (config/default.json)
5. Hardcoded defaults (lowest priority)

## 7. DEVELOPER EXPERIENCE

Developer experience is prioritized to maximize productivity and reduce friction.

### Local Development Setup Guide

New developers get productive within minutes following this guide.

**Prerequisites:**
- Node.js 20 LTS (use nvm for version management)
- Docker Desktop (for database and helper services)
- Git (for version control)
- VS Code or Cursor (recommended editors)
- Postman or Insomnia (API testing)

**Initial Setup (5 minutes):**

```bash
# Clone repository
git clone https://github.com/krewpact/krewpact.git
cd krewpact

# Install dependencies
npm install

# Create environment files
cp .env.example .env
cp api/.env.example api/.env

# Start Docker services
docker compose up -d

# Run database migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Start development servers
npm run dev
```

**Verification:**
- Frontend accessible at http://localhost:3001
- API accessible at http://localhost:3000
- Database accessible at localhost:5432
- MailHog UI at http://localhost:8025

**Troubleshooting Guide:**
- Port conflicts: docker ps shows running containers
- Database connection errors: check DATABASE_URL in .env
- Migration failures: docker compose exec db psql to debug
- Node version mismatch: use nvm use to switch versions

### Required Tools and Versions

Exact tool versions prevent "works on my machine" problems.

**Language and Runtime:**
- Node.js 20.11.0 (LTS release)
- TypeScript 5.3.3
- npm 10.2.4 (or use --exact in package.json)

**Database and Cache:**
- PostgreSQL 15.4 (Docker image postgres:15.4-alpine)
- Redis 7.2.3 (Docker image redis:7.2.3-alpine)
- Supabase (cloud hosted)

**Frontend Tools:**
- Next.js 14.1.0
- React 18.2.0
- TypeScript 5.3.3

**Backend Tools:**
- Express.js 4.18.2
- Prisma 5.7.0
- Vitest 1.0.4

**DevOps Tools:**
- Docker 24.0.0+
- Docker Compose 2.20.0+
- Git 2.40.0+

**Version Management:**
- nvm (Node.js version manager)
- .nvmrc file specifies Node version
- npm ci instead of npm install (respects lockfile exactly)

**Verification Command:**
```bash
node --version     # v20.11.0
npm --version      # 10.2.4
docker --version   # Docker version 24.0.0
git --version      # git version 2.40.0
```

### Database Seeding

Seed data enables realistic testing without complex setup.

**Seed Data Included:**
- 3 test users (founder, admin, user roles)
- 10 sample projects (architectural, infrastructure, etc.)
- 50 sample estimates (various statuses)
- 20 sample RFIs and responses
- Payment terms, line items, specifications
- Portal access credentials for testing

**Running Seeds:**
```bash
npm run db:seed        # Seed all fixtures
npm run db:seed:reset  # Clear then seed
npm run db:seed:users  # Seed only users
```

**Seed Data Location:**
- seeds/ directory contains fixture files (JSON format)
- Each fixture file maps to database table
- Order matters (foreign keys must exist first)
- Idempotent seeding (runs multiple times safely)

**Customization:**
- Modify seed files to customize test data
- Add new fixtures for specific test scenarios
- Document fixture format (fields, relationships)
- Automated fixtures generated from database schema

### Mock Services for External APIs

External APIs replaced with mocks during development.

**Mocked Services:**
- ERPNext API (custom responses per endpoint)
- Stripe payment gateway (test credit cards)
- Email service (intercepted to MailHog)
- SMS service (logged, not actually sent)
- File upload service (stored locally)

**Mock Implementation:**
```typescript
// api/mocks/erpnext.ts
export const mockERPNextAPI = {
  getDocument: (doctype, name) => {
    if (doctype === 'Estimate' && name === 'EST-001') {
      return { name: 'EST-001', customer: 'ABC Corp', total: 50000 };
    }
    throw new Error('Document not found');
  }
};
```

**Enabling Mocks:**
- Environment variable MOCK_EXTERNAL_APIS=true
- Interceptor replaces fetch/axios calls
- Test data returned instead of real API calls
- Reduces setup burden and makes tests faster

**Mock Data:**
- fixtures/mock-erpnext-responses.json contains responses
- fixtures/mock-stripe-events.json contains payment events
- Add new responses as needed
- Document expected request format

### Hot Reload Configuration

Hot reload provides instant feedback during development.

**Frontend Hot Reload:**
- Next.js dev server runs on port 3001
- File change triggers automatic rebuild (< 1 second)
- Browser refreshes via Fast Refresh (component state preserved)
- CSS changes apply without page refresh
- No manual reload required

**Backend Hot Reload:**
- nodemon watches backend files for changes
- TypeScript compiles on file change
- Server restarts automatically
- 2-3 second delay for compilation and restart
- Logs show restart status

**Configuration:**
- .eslintrc.js ignores development-only code
- nodemon.json specifies watched directories
- TypeScript tsconfig.json set for development
- CORS configured for localhost:3001

**Disable Hot Reload (if problematic):**
- Next.js: NEXTAUTH_SKIP_ENV_VALIDATION=true (for config issues)
- Backend: npm run dev:no-watch (manual restarts)
- Docker: restart container manually

### VS Code / Cursor Recommended Extensions

Extensions enhance development productivity and code quality.

**Essential Extensions:**
- ES7+ React/Redux/React-Native snippets (dsznajder.es7-react-js-snippets)
- TypeScript Vue Plugin (Vue.volar)
- Prettier - Code formatter (esbenp.prettier-vscode)
- ESLint (dbaeumer.vscode-eslint)
- Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)
- GitHub Copilot (GitHub.copilot)

**Database and API Tools:**
- SQLTools (mtxr.sqltools)
- Thunder Client (rangav.vscode-thunder-client)
- REST Client (humao.rest-client)

**Testing:**
- Test Explorer UI (hbenl.vscode-test-explorer)
- Vitest (vitest.vitest)

**Version Control:**
- GitLens (eamodio.gitlens)
- GitHub Pull Requests (GitHub.vscode-pull-request-github)

**General Development:**
- Code Spell Checker (streetsidesoftware.code-spell-checker)
- Error Lens (usernamehw.errorlens)
- Thunder Client (rangav.vscode-thunder-client)

**Recommended Settings (settings.json):**
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.rulers": [100],
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "eslint.validate": ["javascript", "typescript"],
  "eslint.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

**Cursor-Specific:**
- Cursor includes AI-powered code completion (GPT-4 based)
- Composer feature for multi-file edits
- Superior to standard VS Code for development
- Full VS Code extension compatibility

---

This comprehensive DevOps and CI/CD documentation provides the complete strategy for KrewPact development operations, from local development through production deployment, with emphasis on automation, quality, and developer experience.
