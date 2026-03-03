# Phase 0 + Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean house (Phase 0) then get mdm-website-v2 live with PostHog tracking, upgraded contact forms, and speed-to-lead automation (Phase 1).

**Architecture:** Website-First Funnel. mdm-website-v2 is 95% built. We add PostHog for behavioral tracking, upgrade the contact form with new fields, add a cookie consent banner, and wire speed-to-lead alerts via Teams webhook. The existing KrewPact API integration in the contact form stays as-is (it will activate once KrewPact is built in Phase 2).

**Tech Stack:** Next.js 16, Payload CMS 3.x, PostHog (cloud free), Resend, Microsoft Teams webhook, Vitest, Playwright

---

## Phase 0: Clean House

### Task 1: Archive mdm-contracting-hub

**Files:**

- Move: `C:/Users/Michael/Code/mdm-contracting-hub/` → `C:/Users/Michael/Code/MDM-Projects/_archived/mdm-contracting-hub/`

**Step 1: Create \_archived directory if needed**

Run: `mkdir -p C:/Users/Michael/Code/MDM-Projects/_archived/`

**Step 2: Move the repo**

Run: `mv C:/Users/Michael/Code/mdm-contracting-hub C:/Users/Michael/Code/MDM-Projects/_archived/mdm-contracting-hub`

**Step 3: Verify**

Run: `ls C:/Users/Michael/Code/MDM-Projects/_archived/`
Expected: `LeadForge-MDM-Group/  MDM-Hub-Project/  mdm-contracting-hub/`

---

### Task 2: Establish JobTread as feature floor benchmark across all MDM docs

**Context:** JobTread was evaluated as a construction PM platform and serves as KrewPact's long-term feature floor — the minimum feature set KrewPact must always match or exceed across all phases (P0+P1+P2). MDM currently uses Sage 50 Accounting + Sage Construction Management (being migrated to ERPNext). JobTread is a benchmark, not a rejected alternative.

**Files to modify (active repos only — skip archived):**

- Modify: `C:/Users/Michael/Code/MDM-Projects/CLAUDE.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/TASKS.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/memory/glossary.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/memory/context/company.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/CLAUDE.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/README.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/reference/VALIDATION-CHECKLIST-Codebase-vs-Docs.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/docs/architecture/KrewPact-Product-Vision-and-Strategy.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/docs/architecture/KrewPact-Master-Plan.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/docs/architecture/KrewPact-Feature-Function-PRD-Checklist.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/docs/architecture/KrewPact-Forms-Registry.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/docs/architecture/KrewPact-Cost-and-Vendor-Analysis.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/docs/architecture/KrewPact-Execution-Board.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/docs/architecture/KrewPact-Access-and-Workflow-Plan.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/krewpact/docs/architecture/KrewPact-Architecture-Resolution.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/MDM-Book-Internal/05-operations/projects/krewpact.md`
- Modify: `C:/Users/Michael/Code/MDM-Projects/MDM-Book-Internal/01-company/glossary.md`

**Step 1: For each file, reframe JobTread references**

Pattern: Reframe JobTread as the feature floor benchmark, not a rejected tool:

- "replacing JobTread" → "matching or exceeding the JobTread feature floor"
- "JobTread migration" → "Sage data migration"
- "JobTread data exports" → "Sage 50 and Sage Construction Management data exports"
- Glossary entry for JobTread → update to: "JobTread — Construction PM platform evaluated as KrewPact's long-term feature floor. The minimum feature set KrewPact must match or exceed across all phases. MDM uses Sage 50 Accounting + Sage Construction Management (being migrated to ERPNext)."
- Competitor sections referencing JobTread → keep comparison tables, reframe as "benchmark to beat"
- "JobTread sunset" → "JobTread feature parity timeline"

**Step 2: Commit in each repo that changed**

KrewPact repo:

```bash
cd C:/Users/Michael/Code/MDM-Projects/krewpact
git add -A
git commit -m "docs: reframe JobTread as feature floor benchmark

JobTread serves as KrewPact's long-term feature floor — the minimum
feature set to match or exceed across all phases.
MDM currently uses Sage 50 + Sage Construction Management.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

MDM-Book-Internal repo:

```bash
cd C:/Users/Michael/Code/MDM-Projects/MDM-Book-Internal
git add -A
git commit -m "docs: reframe JobTread as feature floor benchmark

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

MDM-Projects root (CLAUDE.md, TASKS.md, memory/):

```bash
cd C:/Users/Michael/Code/MDM-Projects
git add CLAUDE.md TASKS.md memory/
git commit -m "docs: reframe JobTread as feature floor benchmark across memory and project docs

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 1: Website Live + Lead Capture

### Task 3: Add PostHog to mdm-website-v2

**Files:**

- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/package.json` (add posthog-js)
- Create: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/lib/posthog.ts`
- Create: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/components/PostHogProvider.tsx`
- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/app/(frontend)/layout.tsx` (add PostHog provider)
- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/next.config.mjs` (update CSP for PostHog)
- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/.env.example` (add PostHog env vars)
- Test: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/__tests__/posthog.test.ts`

**Step 1: Install posthog-js**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm install posthog-js`

**Step 2: Create PostHog client utility**

Create `src/lib/posthog.ts`:

```typescript
import posthog from 'posthog-js';

export function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (typeof window === 'undefined' || !key) return;

  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    cookie_banner_dismissed: false, // Respect cookie consent
  });
}

export { posthog };
```

**Step 3: Create PostHog provider component**

Create `src/components/PostHogProvider.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/posthog'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    if (pathname && posthog.__loaded) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + '?' + searchParams.toString()
      }
      posthog.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams])

  return <>{children}</>
}
```

**Step 4: Update CSP headers for PostHog**

Modify `next.config.mjs` — add PostHog domains to CSP:

- `script-src`: add `https://us.i.posthog.com`
- `connect-src`: add `https://us.i.posthog.com`

**Step 5: Add PostHog provider to frontend layout**

Modify `src/app/(frontend)/layout.tsx`:

- Import `PostHogProvider` from `@/components/PostHogProvider`
- Wrap children with `<PostHogProvider>` inside the `<ClientLayout>` wrapper
- Add `<Suspense>` boundary around PostHogProvider (searchParams needs it)

**Step 6: Add env vars to .env.example**

Add to `.env.example`:

```env
# PostHog Analytics (optional — tracking disabled without key)
# NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
# NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Step 7: Write test**

Create `src/__tests__/posthog.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock posthog-js before import
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    __loaded: false,
  },
  posthog: {
    init: vi.fn(),
    capture: vi.fn(),
    __loaded: false,
  },
}));

describe('PostHog initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  });

  it('does not initialize without NEXT_PUBLIC_POSTHOG_KEY', async () => {
    const { initPostHog } = await import('@/lib/posthog');
    const posthogModule = await import('posthog-js');
    initPostHog();
    expect(posthogModule.default.init).not.toHaveBeenCalled();
  });

  it('initializes with NEXT_PUBLIC_POSTHOG_KEY set', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test123';
    // Mock window
    Object.defineProperty(global, 'window', { value: {}, writable: true });
    const { initPostHog } = await import('@/lib/posthog');
    const posthogModule = await import('posthog-js');
    initPostHog();
    expect(posthogModule.default.init).toHaveBeenCalledWith(
      'phc_test123',
      expect.objectContaining({
        capture_pageview: true,
      }),
    );
  });
});
```

**Step 8: Run tests**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm test`
Expected: All existing tests pass + new PostHog test passes

**Step 9: Commit**

```bash
cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2
git add src/lib/posthog.ts src/components/PostHogProvider.tsx src/app/\(frontend\)/layout.tsx next.config.mjs .env.example package.json package-lock.json src/__tests__/posthog.test.ts
git commit -m "feat: add PostHog analytics for visitor behavioral tracking

Tracks pageviews, page leaves, and session data. Respects cookie consent.
Only initializes when NEXT_PUBLIC_POSTHOG_KEY env var is set.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Add cookie consent banner (PIPEDA compliance)

**Files:**

- Create: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/components/CookieConsent.tsx`
- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/app/(frontend)/layout.tsx` (add banner)
- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/lib/posthog.ts` (respect consent)

**Step 1: Create cookie consent component**

Create `src/components/CookieConsent.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { posthog } from '@/lib/posthog'

const CONSENT_KEY = 'mdm_cookie_consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
    if (posthog.__loaded) {
      posthog.opt_in_capturing()
    }
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setVisible(false)
    if (posthog.__loaded) {
      posthog.opt_out_capturing()
    }
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg lg:bottom-4 lg:left-4 lg:right-auto lg:max-w-sm lg:rounded-xl lg:border"
    >
      <p className="text-sm text-gray-600 mb-3">
        We use cookies to understand how visitors interact with our site.
        This helps us improve our services. No personal data is sold.
      </p>
      <div className="flex gap-2">
        <button
          onClick={accept}
          className="flex-1 px-4 py-2 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={decline}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Update PostHog init to respect consent**

Modify `src/lib/posthog.ts` — add `opt_out_capturing_by_default: true` to PostHog init config. This ensures tracking only starts AFTER consent.

**Step 3: Add banner to layout**

Modify `src/app/(frontend)/layout.tsx` — add `<CookieConsent />` before closing `</body>`.

**Step 4: Run tests**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/components/CookieConsent.tsx src/lib/posthog.ts src/app/\(frontend\)/layout.tsx
git commit -m "feat: add PIPEDA-compliant cookie consent banner

Tracking opt-out by default. Only captures after explicit consent.
Decline removes all tracking cookies.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Upgrade contact form with new fields

**Files:**

- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/components/ContactForm.tsx`
- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/app/api/contact/route.ts`

**Step 1: Add new fields to ContactForm.tsx**

Add these fields to the form state and JSX (after the service/position row):

- **Budget Range** (select): "Under $25K", "$25K - $50K", "$50K - $100K", "$100K - $250K", "$250K - $500K", "$500K+", "Not sure yet"
- **Timeline** (select): "ASAP", "1-3 months", "3-6 months", "6-12 months", "Just exploring"
- **How did you hear about us?** (select): "Google Search", "Referral", "Social Media", "Drive-by / Signage", "Repeat Client", "Bid Platform", "Other"

Only show budget/timeline/how-found for `mode === 'quote'` (not job applications).

**Step 2: Update API route to accept new fields**

Modify `src/app/api/contact/route.ts`:

- Destructure `budget`, `timeline`, `howFound` from request body
- Add type + length validation for new fields
- Include in email HTML template
- Include in KrewPact payload (`budgetRange`, `timeline`, `source` fields)

**Step 3: Run tests**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/components/ContactForm.tsx src/app/api/contact/route.ts
git commit -m "feat: add budget, timeline, and referral source to contact form

New fields feed into CRM lead scoring and help sales team
prioritize high-value leads.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Add speed-to-lead Teams webhook

**Files:**

- Create: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/lib/teams-webhook.ts`
- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/app/api/contact/route.ts`
- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/.env.example`
- Test: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/__tests__/teams-webhook.test.ts`

**Step 1: Create Teams webhook utility**

Create `src/lib/teams-webhook.ts`:

```typescript
type LeadAlert = {
  name: string;
  email: string;
  phone?: string;
  service?: string;
  budget?: string;
  timeline?: string;
  howFound?: string;
  message: string;
};

export async function sendTeamsLeadAlert(lead: LeadAlert): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const card = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: '🔥 New Lead from Website',
              weight: 'Bolder',
              size: 'Large',
              color: 'Attention',
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Name', value: lead.name },
                { title: 'Email', value: lead.email },
                { title: 'Phone', value: lead.phone || 'Not provided' },
                { title: 'Service', value: lead.service || 'Not specified' },
                { title: 'Budget', value: lead.budget || 'Not specified' },
                { title: 'Timeline', value: lead.timeline || 'Not specified' },
                { title: 'Source', value: lead.howFound || 'Website' },
              ],
            },
            {
              type: 'TextBlock',
              text: `Message: ${lead.message.substring(0, 200)}${lead.message.length > 200 ? '...' : ''}`,
              wrap: true,
              size: 'Small',
            },
          ],
        },
      },
    ],
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });
}
```

**Step 2: Wire into contact form API**

Modify `src/app/api/contact/route.ts`:

- Import `sendTeamsLeadAlert`
- After the Resend email send, fire-and-forget the Teams alert (same pattern as KrewPact integration)
- Only send for quote submissions, not job applications

**Step 3: Add env var**

Add to `.env.example`:

```env
# Microsoft Teams Incoming Webhook (speed-to-lead alerts)
# TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
```

**Step 4: Write test**

Create `src/__tests__/teams-webhook.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('sendTeamsLeadAlert', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.TEAMS_WEBHOOK_URL;
  });

  it('does nothing without TEAMS_WEBHOOK_URL', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { sendTeamsLeadAlert } = await import('@/lib/teams-webhook');
    await sendTeamsLeadAlert({ name: 'Test', email: 'test@test.com', message: 'Hi' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends adaptive card to Teams webhook', async () => {
    process.env.TEAMS_WEBHOOK_URL = 'https://outlook.office.com/webhook/test';
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok'));

    vi.resetModules();
    const { sendTeamsLeadAlert } = await import('@/lib/teams-webhook');
    await sendTeamsLeadAlert({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '416-555-1234',
      service: 'General Contracting',
      budget: '$100K - $250K',
      message: 'Need a renovation',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://outlook.office.com/webhook/test',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
```

**Step 5: Run tests**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/lib/teams-webhook.ts src/app/api/contact/route.ts .env.example src/__tests__/teams-webhook.test.ts
git commit -m "feat: add speed-to-lead Teams webhook for instant lead alerts

Sends adaptive card to Teams channel within seconds of form submission.
Includes name, email, phone, service, budget, timeline, and source.
Fire-and-forget pattern — does not block form response.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Add auto-reply email to form submitters

**Files:**

- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/app/api/contact/route.ts`

**Step 1: Add auto-reply after the internal notification email**

After the existing `resend.emails.send()` call, add a second send for the auto-reply to the submitter:

```typescript
// Auto-reply to submitter (fire and forget)
resend.emails
  .send({
    from: process.env.RESEND_FROM_EMAIL || 'MDM Group Inc. <noreply@updates.mdmgroupinc.ca>',
    to: [email],
    subject: 'Thanks for contacting MDM Contracting',
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2d2d2d; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
        Thank you, ${safeName}!
      </h2>
      <p style="color: #333; line-height: 1.6;">
        We've received your message and a member of our team will be in touch within 24 hours.
      </p>
      <p style="color: #333; line-height: 1.6;">
        In the meantime, check out some of our recent work:
      </p>
      <p style="margin: 20px 0;">
        <a href="https://mdmcontracting.ca/gallery" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          View Our Portfolio
        </a>
      </p>
      <p style="font-size: 12px; color: #999; margin-top: 24px;">
        MDM Contracting — Quality Work. Fair Pricing. Exceptional Workmanship.
      </p>
    </div>
  `,
  })
  .catch((err) => console.error('Auto-reply failed:', err));
```

Only send auto-reply for quote submissions (not job applications — those get a different message).

**Step 2: Run tests**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/app/api/contact/route.ts
git commit -m "feat: add auto-reply email to contact form submitters

Sends branded confirmation within seconds. Includes portfolio link.
Fire-and-forget pattern — does not block form response.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Track contact form events in PostHog

**Files:**

- Modify: `C:/Users/Michael/Code/MDM-Projects/mdm-website-v2/src/components/ContactForm.tsx`

**Step 1: Add PostHog event tracking to form**

Import `posthog` from `@/lib/posthog` and capture events:

- On form submit success: `posthog.capture('contact_form_submitted', { service, budget, timeline, howFound })`
- On form submit error: `posthog.capture('contact_form_error', { error: errorMsg })`
- Identify user on success: `posthog.identify(email, { name, phone, service })`

This links the anonymous visitor profile to the lead's email, so all prior page views are attributed.

**Step 2: Run tests**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/components/ContactForm.tsx
git commit -m "feat: track contact form events in PostHog

Captures form submissions and errors. Identifies visitor by email
on successful submit, linking anonymous browsing history to lead.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Build verification and production readiness

**Step 1: Run full test suite**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm test`
Expected: All 198+ tests pass (plus new tests)

**Step 2: Run lint**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm run lint`
Expected: Clean

**Step 3: Run build**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm run build`
Expected: Build succeeds

**Step 4: Test locally**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && npm run dev`

- Visit http://localhost:3000 — verify site loads
- Visit http://localhost:3000/contact — verify new form fields appear
- Check browser console — verify no PostHog errors (won't capture without key)
- Check cookie consent banner appears
- Submit test form — verify email sends and no errors

**Step 5: Commit any fixes**

If anything broke, fix and commit.

---

### Task 10: Set up PostHog project and configure env vars

**Step 1: Create PostHog account**

1. Go to https://app.posthog.com/signup
2. Sign up with MDM email
3. Create project "MDM Website"
4. Copy the project API key

**Step 2: Set env vars in Vercel**

Run:

```bash
cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2
npx vercel env add NEXT_PUBLIC_POSTHOG_KEY
# Paste: phc_xxxxx (your project key)
npx vercel env add NEXT_PUBLIC_POSTHOG_HOST
# Paste: https://us.i.posthog.com
```

**Step 3: Set Teams webhook (if ready)**

1. In Microsoft Teams, go to the target channel → Connectors → Incoming Webhook
2. Name it "MDM Website Leads"
3. Copy the webhook URL
4. Add to Vercel: `npx vercel env add TEAMS_WEBHOOK_URL`

**Step 4: Deploy**

Run: `cd C:/Users/Michael/Code/MDM-Projects/mdm-website-v2 && git push origin main`
Vercel auto-deploys from main.

**Step 5: Verify in production**

1. Visit https://mdmcontracting.ca
2. Accept cookies
3. Navigate to a few pages
4. Check PostHog dashboard — verify events appearing
5. Submit test contact form
6. Verify: internal email received, auto-reply sent, Teams alert fired

---

## Summary

| Task | What                                        | Repo                             | Est. Effort |
| ---- | ------------------------------------------- | -------------------------------- | ----------- |
| 1    | Archive mdm-contracting-hub                 | filesystem                       | 2 min       |
| 2    | Reframe JobTread as feature floor benchmark | krewpact, MDM-Book, MDM-Projects | 30 min      |
| 3    | Add PostHog analytics                       | mdm-website-v2                   | 20 min      |
| 4    | Cookie consent banner                       | mdm-website-v2                   | 15 min      |
| 5    | Upgrade contact form fields                 | mdm-website-v2                   | 20 min      |
| 6    | Teams webhook for leads                     | mdm-website-v2                   | 15 min      |
| 7    | Auto-reply email                            | mdm-website-v2                   | 10 min      |
| 8    | PostHog form event tracking                 | mdm-website-v2                   | 10 min      |
| 9    | Build verification                          | mdm-website-v2                   | 15 min      |
| 10   | PostHog + Teams setup + deploy              | Vercel + services                | 20 min      |

**Total:** ~10 tasks, ~2.5 hours of implementation

**After this plan:** Move to Phase 2 plan (KrewPact CRM module — separate plan doc).
