# Checkly Synthetic Monitoring

## Setup

1. Create a free account at https://www.checklyhq.com
2. Install CLI: `npm install -g checkly`
3. Login: `checkly login`
4. Deploy checks: `checkly deploy --directory checkly/`

## What's Monitored

| Check         | Frequency | What                                       |
| ------------- | --------- | ------------------------------------------ |
| Health API    | 1 min     | `GET /api/health` — 200 + status: ok + <3s |
| Auth Page     | 5 min     | `GET /auth` — no 500 + <5s                 |
| Web Leads API | 5 min     | `POST /api/web/leads` — no 500 + <5s       |
| Homepage      | 5 min     | `GET /` — no 500 + <5s                     |

## Free Tier

5 API checks, 10K check runs/month — sufficient for these 4 checks.
