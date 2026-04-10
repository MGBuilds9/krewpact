/**
 * Checkly Monitoring-as-Code — KrewPact Health Check
 *
 * Setup:
 *   1. Create free account at https://www.checklyhq.com
 *   2. npm install -g checkly
 *   3. checkly login
 *   4. Set env: CHECKLY_API_KEY, CHECKLY_ACCOUNT_ID
 *   5. checkly deploy --directory checkly/
 *
 * These run on Checkly's infrastructure every 5 minutes and alert on failure.
 */
import { ApiCheck, AssertionBuilder } from 'checkly/constructs';

const BASE_URL = process.env.APP_URL || 'https://krewpact.ca';

// 1. Health API — shallow check (every 1 min)
new ApiCheck('krewpact-health-api', {
  name: 'KrewPact Health API',
  activated: true,
  frequency: 1,
  locations: ['us-east-1', 'ca-central-1'],
  request: {
    url: `${BASE_URL}/api/health`,
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('$.status').equals('ok'),
      AssertionBuilder.responseTime().lessThan(3000),
    ],
  },
  alertChannels: [],
  degradedResponseTime: 2000,
  maxResponseTime: 5000,
});

// 2. Auth page loads (every 5 min)
new ApiCheck('krewpact-auth-page', {
  name: 'KrewPact Auth Page',
  activated: true,
  frequency: 5,
  locations: ['us-east-1', 'ca-central-1'],
  request: {
    url: `${BASE_URL}/auth`,
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().lessThan(500),
      AssertionBuilder.responseTime().lessThan(5000),
    ],
  },
  degradedResponseTime: 3000,
  maxResponseTime: 8000,
});

// 3. Public web lead API (every 5 min)
new ApiCheck('krewpact-web-leads-api', {
  name: 'KrewPact Web Leads API',
  activated: true,
  frequency: 5,
  locations: ['us-east-1'],
  request: {
    url: `${BASE_URL}/api/web/leads`,
    method: 'POST',
    headers: [
      { key: 'Content-Type', value: 'application/json' },
      { key: 'x-webhook-secret', value: process.env.WEBHOOK_SIGNING_SECRET || '' },
    ],
    body: JSON.stringify({
      name: 'Checkly Bot',
      email: 'checkly-monitor@synthetic.invalid',
      companyName: 'Checkly Synthetic Monitor',
      source: 'synthetic_monitor',
    }),
    assertions: [
      AssertionBuilder.statusCode().lessThan(500),
      AssertionBuilder.responseTime().lessThan(5000),
    ],
  },
  degradedResponseTime: 3000,
  maxResponseTime: 8000,
});

// 4. Homepage renders (every 5 min)
new ApiCheck('krewpact-homepage', {
  name: 'KrewPact Homepage',
  activated: true,
  frequency: 5,
  locations: ['us-east-1', 'ca-central-1'],
  request: {
    url: BASE_URL,
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().lessThan(500),
      AssertionBuilder.responseTime().lessThan(5000),
    ],
  },
  degradedResponseTime: 3000,
  maxResponseTime: 8000,
});
