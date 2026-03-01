# Microsoft Graph Integration Design

**Date:** 2026-02-24
**Status:** Approved

## Summary

Wire Microsoft Graph API into KrewPact for full email + calendar access. Clerk already brokers M365 OAuth tokens with all required scopes. Azure app "MDM Hub" is registered and working.

## Token Flow

```
User logs in (M365 SSO via Clerk)
  → Clerk stores OAuth token
  → API route calls Clerk: GET /v1/users/{id}/oauth_access_tokens/oauth_microsoft
  → Gets bearer token for graph.microsoft.com
  → Direct fetch to Graph API
```

Clerk handles token refresh automatically. No client-side token handling needed.

## Granted Scopes

- `Mail.ReadWrite`, `Mail.ReadWrite.Shared`, `Mail.Send`, `Mail.Send.Shared`
- `Calendars.ReadWrite`, `Calendars.ReadWrite.Shared`
- `User.Read`, `openid`, `profile`, `email`

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/email/messages` | GET | List inbox (personal or shared mailbox) |
| `/api/email/messages/[id]` | GET | Single message with body |
| `/api/email/send` | POST | Send email (with optional CRM activity link) |
| `/api/calendar/events` | GET | List events (date range, personal or shared) |
| `/api/calendar/events` | POST | Create event |
| `/api/calendar/events/[id]` | GET | Single event detail |

### Shared Mailbox Support

- Query param `?mailbox=info@mdmcontracting.ca` switches from `/me/messages` to `/users/info@mdmcontracting.ca/messages`
- Same pattern for calendar
- Initial shared mailbox: `info@mdmcontracting.ca`

## Shared Library

### `lib/microsoft/graph.ts`
- `getMicrosoftToken(clerkUserId)` — fetches token from Clerk API
- `graphFetch(token, path, options?)` — authenticated fetch wrapper for graph.microsoft.com
- Handles error responses, token expiry (Clerk auto-refreshes)

### `lib/microsoft/types.ts`
- TypeScript types for Graph API responses (Message, Event, etc.)

## CRM Integration

- **Send from CRM context:** When sending email from a lead/contact page, auto-create `activities` record (type: `email`, linked via `lead_id`/`contact_id`)
- **Email history on lead/contact:** Match email addresses to show conversation thread
- **Sequence execution:** Outreach sequences send from user's real M365 mailbox via `Mail.Send` (not Resend). More authentic, better deliverability from @mdmcontracting.ca domain.

## Dashboard Widgets

- **Inbox preview:** 5 most recent unread emails
- **Today's calendar:** Upcoming events for the day

## Approach

Direct `fetch()` to Graph API with Clerk-brokered tokens. No Microsoft SDK package needed — just REST calls.

## Not Included

- Email drafts/folders management
- Calendar attendee management (just simple events for now)
- Background email sync/caching — all real-time from Graph
- Multiple shared mailboxes (just `info@mdmcontracting.ca` for now)
